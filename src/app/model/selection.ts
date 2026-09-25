/**
 * List selection, as pure functions over a small state. Two scopes, never mixed:
 *   ids       rows picked one by one or a page at a time (kept across pages)
 *   matching  everything the current filter matches, including rows not loaded: sent to the
 *             server as the filter, never as a list of ids
 * A selection belongs to one filter. When the search, filters or view change, it is dropped.
 */
import type { RecordFilter } from '../api/schemas';
import type { RecordRow } from './projections';

export type Selection =
  | { scope: 'ids'; rows: ReadonlyMap<string, RecordRow> }
  | { scope: 'matching'; filter: RecordFilter; total: number };

export const EMPTY_SELECTION: Selection = { scope: 'ids', rows: new Map() };

/** The key a selection is valid for. Paging and sorting don't change what matches; searching and filtering do. */
export const filterKey = (filter: RecordFilter) => JSON.stringify([filter.view, filter.q.trim(), [...filter.status].sort()]);

export const selectedCount = (selection: Selection) => (selection.scope === 'matching' ? selection.total : selection.rows.size);

export const isSelected = (selection: Selection, id: string) => selection.scope === 'matching' || selection.rows.has(id);

/** The header checkbox: every row on the page, some of them, or none. */
export const pageState = (selection: Selection, page: readonly RecordRow[]): boolean | 'indeterminate' => {
  if (selection.scope === 'matching') return true;
  const picked = page.filter((row) => selection.rows.has(row.id)).length;
  return picked === 0 ? false : picked === page.length ? true : 'indeterminate';
};

export const toggleRow = (selection: Selection, page: readonly RecordRow[], row: RecordRow, on: boolean): Selection => {
  // Unticking one row of "all matching" narrows the selection to the loaded page, minus that row.
  const rows = new Map(selection.scope === 'ids' ? selection.rows : page.map((r) => [r.id, r]));
  if (on) rows.set(row.id, row);
  else rows.delete(row.id);
  return { scope: 'ids', rows };
};

export const togglePage = (selection: Selection, page: readonly RecordRow[]): Selection => {
  if (pageState(selection, page) === true) {
    if (selection.scope === 'matching') return EMPTY_SELECTION;
    const rows = new Map(selection.rows);
    for (const row of page) rows.delete(row.id);
    return { scope: 'ids', rows };
  }
  const rows = new Map(selection.scope === 'ids' ? selection.rows : []);
  for (const row of page) rows.set(row.id, row);
  return { scope: 'ids', rows };
};

export const selectMatching = (filter: RecordFilter, total: number): Selection => ({ scope: 'matching', filter, total });

/**
 * The bulk-delete guard, from the same predicate the server refuses with. For listed rows it's
 * exact; for "all matching" the rows aren't loaded, so the server reports what it skipped.
 */
export const deletableCount = (selection: Selection) =>
  selection.scope === 'matching' ? selection.total : [...selection.rows.values()].filter((row) => row.deletable).length;

/** What the server is sent: the filter for "all matching", ids otherwise. */
export const toBulkSelection = (selection: Selection) =>
  selection.scope === 'matching' ? { filter: selection.filter } : { ids: [...selection.rows.keys()] };
