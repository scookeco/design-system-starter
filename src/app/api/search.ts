/**
 * Search across the workspace: records, accounts and people in one ranked list, with facet counts
 * and the character ranges that matched (for highlights). The server decides what matches with
 * the same rules as the list and the palette (src/app/model/searchRules.ts), and leaves out what
 * the person may not see. Transport only.
 */
import { z } from 'zod';
import { request } from './client';
import { RecordStatusSchema, RECORD_STATUSES, type RecordStatus, type Tenant } from './schemas';

export const SEARCH_TYPES = ['record', 'account', 'person'] as const;
export const SearchTypeSchema = z.enum(SEARCH_TYPES);
export type SearchType = z.infer<typeof SearchTypeSchema>;

/** [start, end) character offsets into a string: the parts that matched the query. */
const RangesSchema = z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]));

export const SearchHitSchema = z.object({
  type: SearchTypeSchema,
  id: z.string().min(1),
  /** The name shown as the link, and what matched in it. */
  title: z.string().min(1),
  titleMatches: RangesSchema,
  /** A second line (an owner, a domain, an email), and what matched in it. */
  detail: z.string(),
  detailMatches: RangesSchema,
  /** A record's status, for its badge. */
  status: RecordStatusSchema.nullable(),
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const SearchResultsSchema = z.object({
  items: z.array(SearchHitSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  /** Counted for the query alone, whatever type or status is chosen, so each facet says what choosing it would show. */
  facets: z.object({
    types: z.record(SearchTypeSchema, z.number().int().nonnegative()),
    statuses: z.record(RecordStatusSchema, z.number().int().nonnegative()),
  }),
});
export type SearchResults = z.infer<typeof SearchResultsSchema>;

export interface SearchQuery {
  q: string;
  /** One type, or '' for every type the person may search. */
  type: SearchType | '';
  /** Records only: any of these statuses (none = all). */
  status: readonly RecordStatus[];
  page: number;
  pageSize: number;
}

export const searchParams = (query: SearchQuery) => {
  const params = new URLSearchParams({ q: query.q, page: String(query.page), pageSize: String(query.pageSize) });
  if (query.type) params.set('type', query.type);
  const status = query.status.filter((s) => (RECORD_STATUSES as readonly string[]).includes(s));
  if (status.length > 0) params.set('status', status.join(','));
  return params.toString();
};

export const getSearch = (tenant: Tenant, query: SearchQuery, signal?: AbortSignal) => request(SearchResultsSchema, `/t/${tenant}/search?${searchParams(query)}`, { signal });
