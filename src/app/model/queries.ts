/**
 * Reads. Each hook is a view onto the one server cache; components never fetch on their own.
 * The tenant comes from context and leads every key.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { countRecords, getRecord, listPeople, listRecords } from '../api/records';
import type { RecordFilter, RecordQuery } from '../api/schemas';
import { useTenant } from '../tenant';
import { recordKeys } from './keys';

/** One page of a server-side query. The previous page stays on screen while the next loads. */
export function useRecordList(query: RecordQuery) {
  const tenant = useTenant();
  return useQuery({
    queryKey: recordKeys.list(tenant, query),
    queryFn: ({ signal }) => listRecords(tenant, query, signal),
    placeholderData: keepPreviousData,
  });
}

/** Per-tab counts for a search and status filter, counted on the server with the same predicates. */
export function useRecordCounts(filter: Omit<RecordFilter, 'view'>) {
  const tenant = useTenant();
  return useQuery({
    queryKey: recordKeys.count(tenant, filter),
    queryFn: ({ signal }) => countRecords(tenant, filter, signal),
    select: (data) => data.counts,
    placeholderData: keepPreviousData,
  });
}

export function useRecord(id: string) {
  const tenant = useTenant();
  return useQuery({ queryKey: recordKeys.detail(tenant, id), queryFn: ({ signal }) => getRecord(tenant, id, signal) });
}

export function usePeople() {
  const tenant = useTenant();
  return useQuery({ queryKey: recordKeys.people(tenant), queryFn: ({ signal }) => listPeople(tenant, signal), select: (data) => data.items });
}
