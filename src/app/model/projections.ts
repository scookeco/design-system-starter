/**
 * Views are pure projections of cached entities: store → view, no copies. Each derived item keeps
 * the id it came from, and every "what counts as X" goes through a named predicate.
 */
import type { RecordEntity, RecordView } from '../api/schemas';
import { canDelete, isOnLegalHold, VIEW_PREDICATES } from './predicates';
import { STATUS } from './status';

/** A list row. Formatting (dates, money) happens at render, in the reader's locale. */
export interface RecordRow {
  id: RecordEntity['id'];
  name: RecordEntity['name'];
  ownerName: RecordEntity['owner']['name'];
  status: (typeof STATUS)[keyof typeof STATUS];
  legalHold: boolean;
  amount: RecordEntity['amount'];
  updatedAt: RecordEntity['updatedAt'];
  /** Bulk-action guard, from the same predicate the server refuses with. */
  deletable: boolean;
}

export const toRow = (record: RecordEntity): RecordRow => ({
  id: record.id,
  name: record.name,
  ownerName: record.owner.name,
  status: STATUS[record.status],
  legalHold: isOnLegalHold(record),
  amount: record.amount,
  updatedAt: record.updatedAt,
  deletable: canDelete(record),
});

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
