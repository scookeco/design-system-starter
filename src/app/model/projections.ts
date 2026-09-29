/**
 * Views are pure projections of cached entities: store → view, no copies. Each derived item keeps
 * the id it came from, and every "what counts as X" goes through a named predicate.
 */
import type { Capability, Display, RecordColumn, RecordEntity, RecordStatus, RecordView } from '../api/schemas';
import { canDelete, canMove, hasStatus, isOnLegalHold, VIEW_PREDICATES } from './predicates';
import { STATUS } from './status';

/** A list row. Formatting (dates, money) happens at render, in the reader's locale. */
export interface RecordRow {
  id: RecordEntity['id'];
  name: RecordEntity['name'];
  /** References, resolved at render through the people and account caches: a row never copies a name. */
  ownerId: RecordEntity['ownerId'];
  accountId: RecordEntity['accountId'];
  status: (typeof STATUS)[keyof typeof STATUS];
  /** The raw status, for grouping (board columns) and "Move to…" (which statuses it isn't in). */
  statusKey: RecordStatus;
  legalHold: boolean;
  amount: RecordEntity['amount'];
  updatedAt: RecordEntity['updatedAt'];
  /** Bulk-action guard, from the same predicate the server refuses with. */
  deletable: boolean;
  /** Move guard (board), likewise. */
  movable: boolean;
  /** Sent back with a move, so the server can refuse a stale one. */
  version: RecordEntity['version'];
}

/**
 * Projections are memoised by identity, so a list of 10,000 isn't projected again on a render that
 * changed nothing. The cache keeps an unchanged entity (and an unchanged page) as the same object
 * (structural sharing), so the same input always gives back the same output object, and an edit
 * that patches one record re-projects that one row. WeakMaps: nothing outlives the cached data.
 */
const rows = new WeakMap<RecordEntity, RecordRow>();

const projectRow = (record: RecordEntity): RecordRow => ({
  id: record.id,
  name: record.name,
  ownerId: record.ownerId,
  accountId: record.accountId,
  status: STATUS[record.status],
  statusKey: record.status,
  legalHold: isOnLegalHold(record),
  amount: record.amount,
  updatedAt: record.updatedAt,
  deletable: canDelete(record),
  movable: canMove(record),
  version: record.version,
});

/** One record as a list row. The same record object always gives the same row object. */
export const toRow = (record: RecordEntity): RecordRow => {
  let row = rows.get(record);
  if (!row) {
    row = projectRow(record);
    rows.set(record, row);
  }
  return row;
};

const pages = new WeakMap<readonly RecordEntity[], readonly RecordRow[]>();
const NO_ROWS: readonly RecordRow[] = [];

/** A page of records as rows: the same array back while the page is unchanged. */
export const toRows = (records: readonly RecordEntity[] | undefined): readonly RecordRow[] => {
  if (!records) return NO_ROWS;
  let projected = pages.get(records);
  if (!projected) {
    projected = records.map(toRow);
    pages.set(records, projected);
  }
  return projected;
};

/**
 * A list this long is offered the Scroll display: past a few hundred rows, paging ten at a time
 * stops being a way to look through them.
 */
export const LARGE_LIST = 1_000;

/**
 * The list's display modes: one projection (the same rows), several surfaces. A new surface is one
 * entry. Scroll is the table, windowed: every matching row in one scrolling table, fetched a server
 * page at a time as it comes into view, and only the rows in view rendered. It's offered once the
 * list is large (`minTotal`); a link that asks for it always gets it.
 */
export const DISPLAYS = [
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
  { value: 'scroll', label: 'Scroll', minTotal: LARGE_LIST },
] as const satisfies readonly { value: Display; label: string; minTotal?: number }[];
export type { Display };

/** The displays to offer for a list of `total` rows: those it's large enough for, and the current one. */
export const displaysFor = (total: number, current: Display): { value: Display; label: string }[] =>
  DISPLAYS.filter((d) => !('minTotal' in d) || total >= d.minTotal || d.value === current).map(({ value, label }) => ({ value, label }));

/** The table's optional columns, in their order, with their headers. The name column is always there. */
export const COLUMNS: readonly { id: RecordColumn; label: string }[] = [
  { id: 'owner', label: 'Owner' },
  { id: 'account', label: 'Account' },
  { id: 'status', label: 'Status' },
  { id: 'updated', label: 'Updated' },
  { id: 'amount', label: 'Amount' },
];

/** A board column: a status, its label and tone, and the rows its predicate lets through. */
export interface BoardColumn {
  status: RecordStatus;
  label: string;
  tone: (typeof STATUS)[RecordStatus]['tone'];
  rows: readonly RecordRow[];
}

/**
 * The board: the list's rows, grouped by the per-status predicates. Columns are the statuses the
 * view lets through (narrowed by the status filter when one is set), so a tab, a filter and a
 * column can never disagree about what belongs where.
 */
const boards = new WeakMap<readonly RecordRow[], Map<string, readonly BoardColumn[]>>();

export const toBoard = (rows: readonly RecordRow[], view: RecordView, status: readonly RecordStatus[]): readonly BoardColumn[] => {
  // Memoised on the rows (by identity) and the view and filter (by value): see toRow.
  const key = `${view}|${status.join(',')}`;
  const byFilter = boards.get(rows) ?? new Map<string, readonly BoardColumn[]>();
  boards.set(rows, byFilter);
  let board = byFilter.get(key);
  if (!board) {
    board = statusOptionsFor(view)
      .filter((option) => status.length === 0 || status.includes(option.value))
      .map(({ value }) => ({ status: value, label: STATUS[value].label, tone: STATUS[value].tone, rows: rows.filter((row) => hasStatus(value)({ status: row.statusKey })) }));
    byFilter.set(key, board);
  }
  return board;
};

/**
 * The list's tabs: a label per view. Each view *is* a predicate (VIEW_PREDICATES); a new tab is one
 * entry in both. A tab that needs a capability says so, and shows only to people who hold it.
 */
export const VIEWS: readonly { view: RecordView; label: string; matches: (record: Pick<RecordEntity, 'status'>) => boolean; requires?: Capability }[] = [
  { view: 'all', label: 'All', matches: VIEW_PREDICATES.all },
  { view: 'open', label: 'Open', matches: VIEW_PREDICATES.open },
  { view: 'drafts', label: 'Drafts', matches: VIEW_PREDICATES.drafts, requires: 'record:read-drafts' },
  { view: 'archived', label: 'Archived', matches: VIEW_PREDICATES.archived },
];

/** Statuses a person can filter by within a view: the ones the view's predicate lets through. */
export const statusOptionsFor = (view: RecordView) =>
  (Object.keys(STATUS) as (keyof typeof STATUS)[]).filter((status) => VIEW_PREDICATES[view]({ status })).map((status) => ({ value: status, label: STATUS[status].label }));
