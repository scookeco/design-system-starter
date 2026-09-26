/**
 * Search as you type, for the command palette: the same server-side records query as the list
 * (same key, same predicates, same projection per role), five at a time, only once there's
 * something to search for. A viewer's search finds no drafts because the server's query doesn't.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listRecords } from '../api/records';
import type { RecordQuery } from '../api/schemas';
import { usePartition } from '../session';
import { useTenant } from '../tenant';
import { recordKeys } from './keys';

/** The fewest characters worth a request. */
export const MIN_SEARCH_LENGTH = 2;

export function useRecordSearch(q: string, { enabled = true }: { enabled?: boolean } = {}) {
  const tenant = useTenant();
  const partition = usePartition();
  const query: RecordQuery = { q: q.trim(), status: [], view: 'all', sort: '-updated', page: 1, pageSize: 5 };
  return useQuery({
    queryKey: recordKeys.list(partition, query),
    queryFn: ({ signal }) => listRecords(tenant, query, signal),
    enabled: enabled && query.q.length >= MIN_SEARCH_LENGTH,
    // Keep the last answer on screen while the next keystroke's loads (same partition only: the key leads with it).
    placeholderData: keepPreviousData,
  });
}
