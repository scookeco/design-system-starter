/**
 * The mock workspace search: records (joined with their owner's name, like the list), accounts and
 * people, ranked by one rule, filtered by what the person may see, with facet counts for the query.
 */
import { http, HttpResponse } from 'msw';
import { SEARCH_TYPES, SearchTypeSchema, type SearchHit, type SearchType } from '../api/search';
import { RecordStatusSchema, RECORD_STATUSES, type RecordStatus } from '../api/schemas';
import { can, canSee } from '../model/permissions';
import { isArchived } from '../model/predicates';
import { matchRanges, MIN_QUERY, SEARCH_TYPE_CAPABILITY, searchScore } from '../model/searchRules';
import { db } from './db';
import { handle } from './route';

const API = '*/api/t/:tenant';

const hit = (type: SearchType, id: string, title: string, detail: string, q: string, status: RecordStatus | null): { hit: SearchHit; score: number } => {
  const titleMatches = matchRanges(title, q);
  const detailMatches = matchRanges(detail, q);
  return { hit: { type, id, title, titleMatches, detail, detailMatches, status }, score: searchScore(titleMatches, detailMatches) };
};

export const searchHandlers = [
  http.get(
    `${API}/search`,
    handle('workspace:read', ({ tenant, grant, request }) => {
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') ?? '').trim();
      const type = SearchTypeSchema.safeParse(url.searchParams.get('type'));
      const statuses = (url.searchParams.get('status') ?? '').split(',').flatMap((s) => {
        const parsed = RecordStatusSchema.safeParse(s);
        return parsed.success ? [parsed.data] : [];
      });
      const pageSize = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') ?? '', 10) || 20));
      const partition = db(tenant);
      const names = new Map(partition.people.map((p) => [p.id, p.name]));
      const accounts = new Map(partition.accounts.map((a) => [a.id, a.name]));
      const allowed = (t: SearchType) => can(grant, SEARCH_TYPE_CAPABILITY[t]);

      const all =
        q.length < MIN_QUERY
          ? []
          : [
              ...(allowed('record')
                ? partition.records
                    // Archived records stay out of search, as they stay out of the list's All tab.
                    .filter((r) => canSee(grant, r) && !isArchived(r))
                    .map((r) => hit('record', r.id, r.name, [names.get(r.ownerId), r.accountId ? accounts.get(r.accountId) : undefined].filter(Boolean).join(' · '), q, r.status))
                : []),
              ...(allowed('account') ? partition.accounts.map((a) => hit('account', a.id, a.name, a.domain, q, null)) : []),
              ...(allowed('person') ? partition.people.map((p) => hit('person', p.id, p.name, p.email, q, null)) : []),
            ].filter((h) => h.score > 0);

      const types = Object.fromEntries(SEARCH_TYPES.map((t) => [t, all.filter((h) => h.hit.type === t).length])) as Record<SearchType, number>;
      const records = all.filter((h) => h.hit.type === 'record');
      const facetStatuses = Object.fromEntries(RECORD_STATUSES.map((s) => [s, records.filter((h) => h.hit.status === s).length])) as Record<RecordStatus, number>;

      const matches = all
        .filter(({ hit: h }) => !type.success || h.type === type.data)
        // A status filter narrows records; other types have no status, so it leaves them out.
        .filter(({ hit: h }) => statuses.length === 0 || (h.status !== null && statuses.includes(h.status)))
        .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title, 'en', { sensitivity: 'base', numeric: true }) || a.hit.id.localeCompare(b.hit.id));
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      const page = Math.min(pages, Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1));
      const items = matches.slice((page - 1) * pageSize, page * pageSize).map((m) => m.hit);
      return HttpResponse.json({ items, total: matches.length, page, pageSize, facets: { types, statuses: facetStatuses } });
    }),
  ),
];
