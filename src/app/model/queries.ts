/**
 * Reads. Each hook is a view onto the one server cache; components never fetch on their own.
 * The tenant comes from context and leads every key.
 */
import { useQueries, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { getAccount, listAccounts } from '../api/accounts';
import { listJobs } from '../api/jobs';
import { listViews } from '../api/views';
import { countRecords, getRecord, listPeople, listRecords } from '../api/records';
import type { Account, Job, RecordEntity, RecordFilter, RecordQuery } from '../api/schemas';
import { usePartition } from '../session';
import { useTenant } from '../tenant';
import { isActiveJob, jobSettings } from './jobs';
import { accountKeys, jobKeys, recordKeys, viewKeys, type Partition } from './keys';
import { refetchAfterWrite } from './refetch';

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

/** Rows per server page when a list is read as a window (the Scroll display): the server's largest page. */
export const WINDOW_PAGE_SIZE = 100;

export interface RecordWindow {
  /** Every row the query matches, from the server (undefined until the first page answers). */
  total: number | undefined;
  /** The record at a row index, once its page has loaded. */
  recordAt: (index: number) => RecordEntity | undefined;
  /** The page holding each row: the projection memoises on it (toRows). */
  pageAt: (index: number) => readonly RecordEntity[] | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * A server-side query read as a window: the pages (WINDOW_PAGE_SIZE rows each) that rows
 * `first`..`last` fall in, fetched as they come into view. Each page is an ordinary list query
 * under the lists prefix, so everything that keeps lists right (patchListedRecord, the write
 * queues, live events, refetchAfterWrite) keeps these right too. The first page is always read:
 * it carries the total, so the scrollbar knows its length before anything else loads.
 */
export function useRecordWindow(filter: Omit<RecordQuery, 'page' | 'pageSize'>, first: number, last: number): RecordWindow {
  const tenant = useTenant();
  const partition = usePartition();
  const firstPage = Math.floor(Math.max(0, first) / WINDOW_PAGE_SIZE);
  const lastPage = Math.max(firstPage, Math.floor(Math.max(0, last) / WINDOW_PAGE_SIZE));
  const pages = [...new Set([0, ...Array.from({ length: lastPage - firstPage + 1 }, (_, i) => firstPage + i)])];
  return useQueries({
    queries: pages.map((index) => {
      const query: RecordQuery = { ...filter, page: index + 1, pageSize: WINDOW_PAGE_SIZE };
      return { queryKey: recordKeys.list(partition, query), queryFn: ({ signal }: { signal: AbortSignal }) => listRecords(tenant, query, signal) };
    }),
    combine: (results) => {
      const byPage = new Map(pages.map((index, i) => [index, results[i]?.data?.items]));
      const pageAt = (row: number) => byPage.get(Math.floor(row / WINDOW_PAGE_SIZE));
      return {
        total: results[0]?.data?.total,
        pageAt,
        recordAt: (row: number) => pageAt(row)?.[row % WINDOW_PAGE_SIZE],
        isPending: results[0]?.isPending ?? true,
        isError: results.some((r) => r.isError),
        refetch: () => {
          for (const r of results) if (r.isError) void r.refetch();
        },
      };
    },
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


/**
 * The signed-in person's jobs in this workspace (src/app/model/jobs.ts), polled while any is queued
 * or running. When a job moves on, the records it touched have changed: lists and counts refetch.
 */
export function useJobs() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  const key = jobKeys.list(partition);
  return useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const before = client.getQueryData<{ items: Job[] }>(key)?.items ?? [];
      const answer = await listJobs(tenant, signal);
      const moved = answer.items.some((job) => {
        const was = before.find((b) => b.id === job.id);
        return was !== undefined && (was.done !== job.done || was.state !== job.state);
      });
      if (moved) {
        // The job changed records on the server: even a list still on its first load reads again.
        void refetchAfterWrite(client, recordKeys.lists(partition));
        void refetchAfterWrite(client, recordKeys.counts(partition));
      }
      return answer;
    },
    select: (data) => data.items,
    refetchInterval: (query) => (query.state.data?.items.some(isActiveJob) && Number.isFinite(jobSettings.pollMs) ? jobSettings.pollMs : false),
  });
}
