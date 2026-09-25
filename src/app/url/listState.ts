/**
 * The list page's URL: /records?view=open&q=lease&status=pending,overdue&sort=-amount&page=2.
 * Every value is validated here; anything unknown falls back to its default, so a hand-edited or
 * stale link still opens a sensible view.
 */
import { RECORD_VIEWS, SORT_KEYS, type RecordStatus, type RecordView, type SortKey } from '../api/schemas';
import { statusOptionsFor } from '../model/projections';
import type { UrlCodec } from './useUrlState';

export interface ListUrlState {
  view: RecordView;
  q: string;
  status: readonly RecordStatus[];
  sort: SortKey;
  page: number;
}

export const LIST_DEFAULTS: ListUrlState = { view: 'all', q: '', status: [], sort: 'name', page: 1 };

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
    };
  },
  serialise: (state) => {
    const params = new URLSearchParams();
    if (state.view !== LIST_DEFAULTS.view) params.set('view', state.view);
    if (state.q.trim() !== '') params.set('q', state.q);
    if (state.status.length > 0) params.set('status', state.status.join(','));
    if (state.sort !== LIST_DEFAULTS.sort) params.set('sort', state.sort);
    if (state.page !== LIST_DEFAULTS.page) params.set('page', String(state.page));
    return params.toString().replaceAll('%2C', ',');
  },
};
