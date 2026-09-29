/**
 * URL state for the search results page: what a copied link must reproduce.
 *
 *   /search?q=lease&type=record&status=pending,overdue&page=2
 *
 * Every value is validated here and falls back to its default. The query is pushed when it's
 * submitted from elsewhere (the palette's "See all results"), and replaced while typing.
 */
import { SEARCH_TYPES, type SearchType } from '../api/search';
import { RECORD_STATUSES, type RecordStatus } from '../api/schemas';
import type { UrlCodec } from './useUrlState';

export interface SearchUrlState {
  q: string;
  type: SearchType | '';
  status: readonly RecordStatus[];
  page: number;
}

export const SEARCH_DEFAULTS: SearchUrlState = { q: '', type: '', status: [], page: 1 };

export const searchCodec: UrlCodec<SearchUrlState> = {
  parse: (search) => {
    const params = new URLSearchParams(search);
    const type = params.get('type');
    const asked = new Set((params.get('status') ?? '').split(','));
    const page = Number(params.get('page') ?? '');
    return {
      q: (params.get('q') ?? '').slice(0, 200),
      type: (SEARCH_TYPES as readonly (string | null)[]).includes(type) ? (type as SearchType) : '',
      status: RECORD_STATUSES.filter((s) => asked.has(s)),
      page: Number.isInteger(page) && page >= 1 ? page : 1,
    };
  },
  serialise: (state) => {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.type) params.set('type', state.type);
    if (state.status.length > 0) params.set('status', state.status.join(','));
    if (state.page !== 1) params.set('page', String(state.page));
    return params.toString().replaceAll('%2C', ',');
  },
};

/** The results page for a query: where the palette's "See all results" goes. */
export const searchHref = (q: string) => `/search?${searchCodec.serialise({ ...SEARCH_DEFAULTS, q: q.trim() })}`;
