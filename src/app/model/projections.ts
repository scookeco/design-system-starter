/**
 * Views are pure projections of cached entities: store → view, no copies. Each derived item keeps
 * the id it came from, and every "what counts as X" goes through a named predicate.
 */
import type { RecordEntity, RecordStatus, RecordView } from '../api/schemas';
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

export const toRow = (record: RecordEntity): RecordRow => ({
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

/** The list's display modes: one projection (the same rows), two surfaces. A new surface is one entry. */
export const DISPLAYS = [
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
] as const;
export type Display = (typeof DISPLAYS)[number]['value'];

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
export const toBoard = (rows: readonly RecordRow[], view: RecordView, status: readonly RecordStatus[]): BoardColumn[] =>
  statusOptionsFor(view)
    .filter((option) => status.length === 0 || status.includes(option.value))
    .map(({ value }) => ({ status: value, label: STATUS[value].label, tone: STATUS[value].tone, rows: rows.filter((row) => hasStatus(value)({ status: row.statusKey })) }));

/** The list's tabs: a label per view. Each view *is* a predicate (VIEW_PREDICATES); a new tab is one entry in both. */
export const VIEWS: readonly { view: RecordView; label: string; matches: (record: Pick<RecordEntity, 'status'>) => boolean }[] = [
  { view: 'all', label: 'All', matches: VIEW_PREDICATES.all },
  { view: 'open', label: 'Open', matches: VIEW_PREDICATES.open },
  { view: 'drafts', label: 'Drafts', matches: VIEW_PREDICATES.drafts },
  { view: 'archived', label: 'Archived', matches: VIEW_PREDICATES.archived },
];

/** Statuses a person can filter by within a view: the ones the view's predicate lets through. */
export const statusOptionsFor = (view: RecordView) =>
  (Object.keys(STATUS) as (keyof typeof STATUS)[]).filter((status) => VIEW_PREDICATES[view]({ status })).map((status) => ({ value: status, label: STATUS[status].label }));
