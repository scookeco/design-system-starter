/**
 * The list page's URL: /records?view=open&q=lease&status=pending,overdue&sort=-amount&page=2&display=board.
 * Every value is validated here; anything unknown falls back to its default, so a hand-edited or
 * stale link still opens a sensible view.
 */
import { DISPLAY_MODES, RECORD_COLUMNS, RECORD_VIEWS, SORT_KEYS, type Display, type RecordColumn, type RecordStatus, type RecordView, type SavedViewConfig, type SortKey } from '../api/schemas';
import { statusOptionsFor } from '../model/projections';
import type { UrlCodec } from './useUrlState';

export interface ListUrlState {
  view: RecordView;
  q: string;
  status: readonly RecordStatus[];
  sort: SortKey;
  page: number;
  /** Table or board: two surfaces over the same query. Not "view", which is the tab. */
  display: Display;
  /** The table's visible optional columns, in order. */
  columns: readonly RecordColumn[];
  /** The saved view this state came from, if any (its id). The rest of the URL says what's applied. */
  saved: string;
}

export const LIST_DEFAULTS: ListUrlState = { view: 'all', q: '', status: [], sort: 'name', page: 1, display: 'table', columns: RECORD_COLUMNS, saved: '' };

const oneOf = <T extends string>(allowed: readonly T[], value: string | null, fallback: T): T =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export const listCodec: UrlCodec<ListUrlState> = {
  parse: (search) => {
    const params = new URLSearchParams(search);
    const view = oneOf(RECORD_VIEWS, params.get('view'), LIST_DEFAULTS.view);
    // Only statuses the view lets through, in the filter's own order, once each.
    const allowed = statusOptionsFor(view).map((o) => o.value);
    const asked = new Set((params.get('status') ?? '').split(','));
    const page = Number(params.get('page') ?? '');
    return {
      view,
      q: (params.get('q') ?? '').slice(0, 200),
      status: allowed.filter((status) => asked.has(status)),
      sort: oneOf(SORT_KEYS, params.get('sort'), LIST_DEFAULTS.sort),
      page: Number.isInteger(page) && page >= 1 ? page : LIST_DEFAULTS.page,
      display: oneOf(DISPLAY_MODES, params.get('display'), LIST_DEFAULTS.display),
      columns: params.has('columns') ? RECORD_COLUMNS.filter((c) => new Set((params.get('columns') ?? '').split(',')).has(c)) : LIST_DEFAULTS.columns,
      saved: (params.get('saved') ?? '').slice(0, 64),
    };
  },
  serialise: (state) => {
    const params = new URLSearchParams();
    if (state.view !== LIST_DEFAULTS.view) params.set('view', state.view);
    if (state.q.trim() !== '') params.set('q', state.q);
    if (state.status.length > 0) params.set('status', state.status.join(','));
    if (state.sort !== LIST_DEFAULTS.sort) params.set('sort', state.sort);
    if (state.page !== LIST_DEFAULTS.page) params.set('page', String(state.page));
    if (state.display !== LIST_DEFAULTS.display) params.set('display', state.display);
    if (state.columns.join(',') !== LIST_DEFAULTS.columns.join(',')) params.set('columns', state.columns.join(','));
    if (state.saved !== '') params.set('saved', state.saved);
    return params.toString().replaceAll('%2C', ',');
  },
};

/** What a saved view stores: the URL state that makes a view, without paging or which view it came from. */
export const toViewConfig = (state: ListUrlState): SavedViewConfig => ({
  view: state.view,
  q: state.q.trim(),
  status: [...state.status],
  sort: state.sort,
  columns: [...state.columns],
  display: state.display,
});

/** Whether the URL still shows a saved view exactly, or someone has changed it since ("Modified"). */
export const sameConfig = (a: SavedViewConfig, b: SavedViewConfig) => listCodec.serialise({ ...LIST_DEFAULTS, ...a }) === listCodec.serialise({ ...LIST_DEFAULTS, ...b });

