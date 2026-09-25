/**
 * What counts as X, defined once. The list filter, the tab counts, the status badge, the bulk
 * action guards and the (mock) server all call these, so they can never disagree. A new tab is a
 * new entry in VIEW_PREDICATES; a new rule is a new named function here.
 */
import type { RecordEntity, RecordFilter, RecordStatus, RecordView } from '../api/schemas';

/**
 * A record joined with its owner's name, for search. The name is looked up by id at the moment of
 * matching (the server joins it from people), never stored on the record.
 */
export type SearchableRecord = Pick<RecordEntity, 'status' | 'name'> & { ownerName: string };

export const isArchived = (record: Pick<RecordEntity, 'status'>) => record.status === 'archived';
export const isDraft = (record: Pick<RecordEntity, 'status'>) => record.status === 'draft';
/** Open: waiting on someone. Pending approval, or overdue. */
export const isOpen = (record: Pick<RecordEntity, 'status'>) => record.status === 'pending' || record.status === 'overdue';
export const isOnLegalHold = (record: Pick<RecordEntity, 'tags'>) => record.tags.includes('legal-hold');

/** Capabilities are predicates too: the button, the bulk guard and the server's refusal share them. */
export const canRename = (record: Pick<RecordEntity, 'status'>) => !isArchived(record);
export const canArchive = (record: Pick<RecordEntity, 'status'>) => !isArchived(record);
export const canDelete = (record: Pick<RecordEntity, 'tags'>) => !isOnLegalHold(record);
/** Moving between board columns: anything not archived (archive and restore are their own verbs). */
export const canMove = (record: Pick<RecordEntity, 'status'>) => !isArchived(record);

/** One predicate per status: what a board column holds. */
export const hasStatus = (status: RecordStatus) => (record: Pick<RecordEntity, 'status'>) => record.status === status;

/** The list's tabs, as predicates over one set of records. */
export const VIEW_PREDICATES: Record<RecordView, (record: Pick<RecordEntity, 'status'>) => boolean> = {
  all: (record) => !isArchived(record),
  open: isOpen,
  drafts: isDraft,
  archived: isArchived,
};

/** Search matches the name or the owner's name, ignoring case and accents. */
export const matchesSearch = (record: Pick<SearchableRecord, 'name' | 'ownerName'>, q: string) => {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const needle = fold(q.trim());
  return needle === '' || fold(record.name).includes(needle) || fold(record.ownerName).includes(needle);
};

/** One filter, used for the rows, the counts and "Select all N matching". */
export const matchesFilter = (record: SearchableRecord, filter: RecordFilter) =>
  VIEW_PREDICATES[filter.view](record) &&
  (filter.status.length === 0 || filter.status.includes(record.status)) &&
  matchesSearch(record, filter.q);
