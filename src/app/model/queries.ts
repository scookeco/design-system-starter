/**
 * Reads. Each hook is a view onto the one server cache; components never fetch on their own.
 * The tenant comes from context and leads every key.
 */
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { getAccount, listAccounts } from '../api/accounts';
import { listViews } from '../api/views';
import { countRecords, getRecord, listPeople, listRecords } from '../api/records';
import type { Account, RecordFilter, RecordQuery } from '../api/schemas';
import { usePartition } from '../session';
import { useTenant } from '../tenant';
import { accountKeys, recordKeys, viewKeys, type Partition } from './keys';

/**
 * keepPreviousData, but never across a partition: the previous page may stay on screen while the
 * next one loads only if it was fetched for the same workspace and permission scope. Otherwise a
 * role change would show the broader role's rows until the narrower role's arrived.
 */
const keepPreviousInPartition =
  (partition: Partition) =>
  <T,>(previous: T | undefined, previousQuery: { queryKey: QueryKey } | undefined): T | undefined =>
    previousQuery && previousQuery.queryKey[0] === partition[0] && previousQuery.queryKey[1] === partition[1] ? previous : undefined;

/** One page of a server-side query. The previous page stays on screen while the next loads. */
export function useRecordList(query: RecordQuery) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({
    queryKey: recordKeys.list(partition, query),
    queryFn: ({ signal }) => listRecords(tenant, query, signal),
    placeholderData: keepPreviousInPartition(partition),
  });
}

/** Per-tab counts for a search and status filter, counted on the server with the same predicates. */
export function useRecordCounts(filter: Omit<RecordFilter, 'view'>) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({
    queryKey: recordKeys.count(partition, filter),
    queryFn: ({ signal }) => countRecords(tenant, filter, signal),
    placeholderData: keepPreviousInPartition(partition),
  });
}

export function useRecord(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: recordKeys.detail(partition, id), queryFn: ({ signal }) => getRecord(tenant, id, signal) });
}

export function usePeople() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: recordKeys.people(partition), queryFn: ({ signal }) => listPeople(tenant, signal), select: (data) => data.items });
}

/**
 * One person, by id, joined through the people cache: every surface that shows an owner reads it
 * here, so a renamed person is renamed everywhere at once. undefined while loading or if unknown.
 */
export function usePerson(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: recordKeys.people(partition), queryFn: ({ signal }) => listPeople(tenant, signal), select: (data) => data.items.find((p) => p.id === id) });
}

/** Every account: reference data for pickers and joins. */
export function useAccounts() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: accountKeys.list(partition), queryFn: ({ signal }) => listAccounts(tenant, signal), select: (data) => data.items });
}

/**
 * One account for a join (a record's account column, a property): read from the directory, so an
 * account renamed on its own page is renamed in every list without touching a list query.
 */
export function useAccountRef(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: accountKeys.list(partition), queryFn: ({ signal }) => listAccounts(tenant, signal), select: (data) => data.items.find((a) => a.id === id) });
}

/** One account's page. Seeded from the directory when it's already cached, so it opens instantly. */
export function useAccount(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useQuery({
    queryKey: accountKeys.detail(partition, id),
    queryFn: ({ signal }) => getAccount(tenant, id, signal),
    enabled: id !== '',
    initialData: () => client.getQueryData<{ items: Account[] }>(accountKeys.list(partition))?.items.find((a) => a.id === id),
    initialDataUpdatedAt: () => client.getQueryState(accountKeys.list(partition))?.dataUpdatedAt,
  });
}

/** The signed-in person's saved views of the list, in this workspace. */
export function useSavedViews() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: viewKeys.list(partition), queryFn: ({ signal }) => listViews(tenant, signal), select: (data) => data.items });
}

