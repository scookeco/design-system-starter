/**
 * What counts as X, defined once. The list filter, the tab counts, the status badge, the bulk
 * action guards and the (mock) server all call these, so they can never disagree. A new tab is a
 * new entry in VIEW_PREDICATES; a new rule is a new named function here.
 */
import type { RecordEntity, RecordFilter, RecordView } from '../api/schemas';

type Entity = Pick<RecordEntity, 'status' | 'tags' | 'name' | 'owner'>;

export const isArchived = (record: Pick<RecordEntity, 'status'>) => record.status === 'archived';
export const isDraft = (record: Pick<RecordEntity, 'status'>) => record.status === 'draft';
/** Open: waiting on someone. Pending approval, or overdue. */
export const isOpen = (record: Pick<RecordEntity, 'status'>) => record.status === 'pending' || record.status === 'overdue';
export const isOnLegalHold = (record: Pick<RecordEntity, 'tags'>) => record.tags.includes('legal-hold');

/** Capabilities are predicates too: the button, the bulk guard and the server's refusal share them. */
export const canRename = (record: Pick<RecordEntity, 'status'>) => !isArchived(record);
export const canArchive = (record: Pick<RecordEntity, 'status'>) => !isArchived(record);
export const canDelete = (record: Pick<RecordEntity, 'tags'>) => !isOnLegalHold(record);

/** The list's tabs, as predicates over one set of records. */
export const VIEW_PREDICATES: Record<RecordView, (record: Pick<RecordEntity, 'status'>) => boolean> = {
  all: (record) => !isArchived(record),
  open: isOpen,
  drafts: isDraft,
  archived: isArchived,
};

/** Search matches the name or the owner, ignoring case and accents. */
export const matchesSearch = (record: Pick<Entity, 'name' | 'owner'>, q: string) => {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const needle = fold(q.trim());
  return needle === '' || fold(record.name).includes(needle) || fold(record.owner.name).includes(needle);
};

/** One filter, used for the rows, the counts and "Select all N matching". */
export const matchesFilter = (record: Entity, filter: RecordFilter) =>
  VIEW_PREDICATES[filter.view](record) &&
  (filter.status.length === 0 || filter.status.includes(record.status)) &&
  matchesSearch(record, filter.q);
