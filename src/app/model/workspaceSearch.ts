/**
 * The search results page's read: one query per search, type, status and page, under the
 * partition like every key, so a viewer never reads an admin's results. A read only: search has
 * no writes. The matching rules are in ./searchRules.ts; the palette's quick search (./search.ts)
 * shares them for records through the list's own query.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSearch, type SearchQuery } from '../api/search';
import { usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';
import { MIN_QUERY } from './searchRules';

export const searchKeys = {
  all: (p: Partition) => [...p, 'search'] as const,
  results: (p: Partition, query: SearchQuery) => [...p, 'search', query] as const,
};

/** Results for a search, once it's long enough to be worth sending. The last answer stays while the next loads. */
export function useWorkspaceSearch(query: SearchQuery) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({
    queryKey: searchKeys.results(partition, query),
    queryFn: ({ signal }) => getSearch(tenant, query, signal),
    enabled: query.q.trim().length >= MIN_QUERY,
    // Same partition only: the key leads with it, so a role change never shows the old role's results.
    placeholderData: keepPreviousData,
  });
}
