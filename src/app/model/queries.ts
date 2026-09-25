/**
 * Reads. Each hook is a view onto the one server cache; components never fetch on their own.
 * The tenant comes from context and leads every key.
 */
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccount, listAccounts } from '../api/accounts';
import { countRecords, getRecord, listPeople, listRecords } from '../api/records';
import type { Account, RecordFilter, RecordQuery } from '../api/schemas';
import { useTenant } from '../tenant';
import { accountKeys, recordKeys } from './keys';

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

/**
 * One person, by id, joined through the people cache: every surface that shows an owner reads it
 * here, so a renamed person is renamed everywhere at once. undefined while loading or if unknown.
 */
export function usePerson(id: string) {
  const tenant = useTenant();
  return useQuery({ queryKey: recordKeys.people(tenant), queryFn: ({ signal }) => listPeople(tenant, signal), select: (data) => data.items.find((p) => p.id === id) });
}

/** Every account: reference data for pickers and joins. */
export function useAccounts() {
  const tenant = useTenant();
  return useQuery({ queryKey: accountKeys.list(tenant), queryFn: ({ signal }) => listAccounts(tenant, signal), select: (data) => data.items });
}

/**
 * One account for a join (a record's account column, a property): read from the directory, so an
 * account renamed on its own page is renamed in every list without touching a list query.
 */
export function useAccountRef(id: string) {
  const tenant = useTenant();
  return useQuery({ queryKey: accountKeys.list(tenant), queryFn: ({ signal }) => listAccounts(tenant, signal), select: (data) => data.items.find((a) => a.id === id) });
}

/** One account's page. Seeded from the directory when it's already cached, so it opens instantly. */
export function useAccount(id: string) {
  const tenant = useTenant();
  const client = useQueryClient();
  return useQuery({
    queryKey: accountKeys.detail(tenant, id),
    queryFn: ({ signal }) => getAccount(tenant, id, signal),
    initialData: () => client.getQueryData<{ items: Account[] }>(accountKeys.list(tenant))?.items.find((a) => a.id === id),
    initialDataUpdatedAt: () => client.getQueryState(accountKeys.list(tenant))?.dataUpdatedAt,
  });
}
