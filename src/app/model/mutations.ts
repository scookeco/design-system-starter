/**
 * Writes. One named mutation per domain verb; components call these and never touch the cache.
 * The list of hooks here *is* the domain's verb list. Each one documents its presentation
 * (optimistic or pessimistic) and exactly which cache entries it patches and invalidates:
 *
 *   verb               presents     patches                           invalidates
 *   renameRecord       optimistic   detail + every cached list page   detail, lists   (counts can't change)
 *                                   holding it (then rolls back)
 *   moveRecord         pessimistic  detail + listed copies (answer)   lists, counts   (board column)
 *   archiveRecord      pessimistic  detail + listed copies (answer)   lists, counts
 *   createRecord       pessimistic  detail (server's answer)   lists, counts        (idempotency key)
 *   bulkDeleteRecords  pessimistic  removes deleted details    lists, counts
 *   addPerson          pessimistic  people (appends)           people
 *   createAccount      pessimistic  directory (appends), detail  directory       (idempotency key)
 *   updateAccount      pessimistic  directory entry, detail      nothing else: records hold the id, so
 *                                                               every join re-renders from the directory
 */
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { patchAccount, postAccount, type AccountInput } from '../api/accounts';
import { postArchive, postBulkDelete, patchRecordName, postPerson, postRecord, postStatus, type NewRecord } from '../api/records';
import type { Account, Capability, MovableStatus, Person, RecordEntity, RecordFilter, RecordPage, Tenant } from '../api/schemas';
import { useGrant } from '../session';
import { useTenant } from '../tenant';
import { can, DENIAL_REASONS, type Grant } from './permissions';
import { accountKeys, recordKeys } from './keys';

/**
 * The query-cache trap, handled. A query cache doesn't normalize: a record lives in its detail
 * entry AND inside every cached list page that happens to hold it (the table, the board, an
 * account's records, other tabs and pages visited earlier, mounted or not). Patching only the
 * detail leaves every one of those showing the old value until it refetches, and an unmounted
 * list with a long staleTime might not refetch for a while.
 *
 * So a record write patches the detail and then, with one setQueriesData over the lists prefix,
 * the copy in every cached list page that contains it. Pages that don't hold it are left
 * untouched (the updater returns undefined). Membership, order and totals can still change (a
 * rename under sort-by-name, a move out of a tab), which is what the invalidation that follows is
 * for; the patch makes the edit visible everywhere at once, before any refetch lands.
 */
export const patchListedRecord = (client: QueryClient, tenant: Tenant, id: string, patch: (listed: RecordEntity) => RecordEntity | undefined) =>
  client.setQueriesData<RecordPage>({ queryKey: recordKeys.lists(tenant) }, (page) => {
    const index = page?.items.findIndex((r) => r.id === id) ?? -1;
    const listed = page?.items[index];
    if (!page || !listed) return undefined;
    const next = patch(listed);
    return next ? { ...page, items: page.items.map((r, i) => (i === index ? next : r)) } : undefined;
  });

/**
 * Guard every write: each mutation asks the same predicate as the button and the route guard
 * (`can`), and refuses with a 403 of its own before any request is sent. Hiding a button is UX;
 * this and the server's own check are what actually stop a write.
 */
const refuseUnless = (grant: Grant, capability: Capability, subject?: Parameters<typeof can>[2]) => {
  if (!can(grant, capability, subject)) throw new ApiError(403, 'forbidden', DENIAL_REASONS[capability]);
};

/** A 403: this person may not do this (the client refused, or the server did). */
export const isForbidden = (error: unknown): error is ApiError => error instanceof ApiError && error.status === 403;

/** A 409: someone else changed the record since this client read it. */
export const isConflict = (error: unknown): error is ApiError => error instanceof ApiError && error.status === 409;

/**
 * renameRecord: optimistic. The new name shows at once; a failure puts the previous one back,
 * unless a newer write already replaced it. Sends the version it was based on, so a stale edit
 * gets a 409 instead of silently overwriting someone else's change.
 */
export function useRenameRecord(id: string) {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  const key = recordKeys.detail(tenant, id);
  return useMutation({
    mutationKey: [tenant, 'renameRecord', { id }],
    mutationFn: ({ name, version }: { name: string; version: number }) => {
      refuseUnless(grant, 'record:rename', client.getQueryData<RecordEntity>(key));
      return patchRecordName(tenant, id, name, version);
    },
    onMutate: async ({ name, version }) => {
      // Refused before the optimistic patch, so a denied rename never flashes the new name.
      refuseUnless(grant, 'record:rename', client.getQueryData<RecordEntity>(key));
      // A read in flight must not land on top of the optimistic name: not the detail, not a list.
      await Promise.all([client.cancelQueries({ queryKey: key, exact: true }), client.cancelQueries({ queryKey: recordKeys.lists(tenant) })]);
      const previous = client.getQueryData<RecordEntity>(key);
      if (previous) client.setQueryData<RecordEntity>(key, { ...previous, name });
      // Every cached list page holding this record shows the new name too (see patchListedRecord).
      let listedName: string | undefined;
      patchListedRecord(client, tenant, id, (listed) => {
        listedName ??= listed.name;
        return listed.version === version ? { ...listed, name } : undefined;
      });
      return { previous, previousName: previous?.name ?? listedName };
    },
    onError: (_error, { name, version }, context) => {
      const current = client.getQueryData<RecordEntity>(key);
      // Roll back only our own optimistic patch: if something newer landed, leave it.
      if (context?.previous && current?.name === name && current.version === context.previous.version) {
        client.setQueryData(key, context.previous);
      }
      const previousName = context?.previousName;
      if (previousName !== undefined) {
        patchListedRecord(client, tenant, id, (listed) => (listed.name === name && listed.version === version ? { ...listed, name: previousName } : undefined));
      }
    },
    onSuccess: (renamed) => {
      client.setQueryData(key, renamed);
      patchListedRecord(client, tenant, id, () => renamed);
    },
    // Returning the promise keeps the mutation pending until the refetch lands. After a conflict the
    // detail is left alone: the page says so and the person chooses when to reload.
    onSettled: (_data, error) =>
      Promise.all([
        isConflict(error) ? undefined : client.invalidateQueries({ queryKey: key, exact: true }),
        client.invalidateQueries({ queryKey: recordKeys.lists(tenant) }),
      ]),
  });
}

/**
 * moveRecord: pessimistic. A board's "Move to…" (or a drop): the new status, versioned. Takes the
 * record per call, so one hook serves every card on a board.
 */
export function useMoveRecord() {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'moveRecord'],
    mutationFn: ({ record, status }: { record: Pick<RecordEntity, 'id' | 'version'>; status: MovableStatus }) => {
      refuseUnless(grant, 'record:move', client.getQueryData<RecordEntity>(recordKeys.detail(tenant, record.id)));
      return postStatus(tenant, record.id, status, record.version);
    },
    onSuccess: (moved) => {
      client.setQueryData(recordKeys.detail(tenant, moved.id), moved);
      patchListedRecord(client, tenant, moved.id, () => moved);
      return Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(tenant) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(tenant) }),
      ]);
    },
  });
}

/** archiveRecord: pessimistic. Nothing changes until the server says so; then lists and counts refetch. */
export function useArchiveRecord(id: string) {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'archiveRecord', { id }],
    mutationFn: () => {
      refuseUnless(grant, 'record:archive', client.getQueryData<RecordEntity>(recordKeys.detail(tenant, id)));
      return postArchive(tenant, id);
    },
    onSuccess: (archived) => {
      client.setQueryData(recordKeys.detail(tenant, id), archived);
      patchListedRecord(client, tenant, id, () => archived);
      return Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(tenant) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(tenant) }),
      ]);
    },
  });
}

/**
 * createRecord: pessimistic. Carries an idempotency key, so a retry or a double submit makes one
 * record: the caller keeps the same key until the create succeeds. On success: seeds the new
 * record's detail entry, invalidates every list and count.
 */
export function useCreateRecord() {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'createRecord'],
    mutationFn: ({ record, idempotencyKey }: { record: NewRecord; idempotencyKey: string }) => {
      refuseUnless(grant, 'record:create');
      return postRecord(tenant, record, idempotencyKey);
    },
    onSuccess: (created) => {
      client.setQueryData(recordKeys.detail(tenant, created.id), created);
      return Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(tenant) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(tenant) }),
      ]);
    },
  });
}

/** What a bulk action acts on: listed ids, or everything matching a filter ("all 312 matching"). */
export type BulkSelection = { ids: readonly string[] } | { filter: RecordFilter };

/**
 * bulkDeleteRecords: pessimistic, and allowed to partly fail: the server deletes what it can and
 * reports the rest. Deleted records leave the cache; lists and counts refetch.
 */
export function useBulkDeleteRecords() {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'bulkDeleteRecords'],
    mutationFn: (selection: BulkSelection) => {
      refuseUnless(grant, 'record:delete');
      return postBulkDelete(tenant, selection);
    },
    onSuccess: (result) => {
      for (const id of result.deleted) client.removeQueries({ queryKey: recordKeys.detail(tenant, id), exact: true });
      return Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(tenant) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(tenant) }),
      ]);
    },
  });
}

/** addPerson: pessimistic. The quick-create for an owner: appends the new person, then refetches people. */
export function useAddPerson() {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'addPerson'],
    mutationFn: (name: string) => {
      refuseUnless(grant, 'people:create');
      return postPerson(tenant, name);
    },
    onSuccess: (person) => {
      client.setQueryData<{ items: Person[] }>(recordKeys.people(tenant), (current) => (current ? { items: [...current.items, person] } : current));
      return client.invalidateQueries({ queryKey: recordKeys.people(tenant) });
    },
  });
}

/** Put one account into the directory (replacing it by id, or appending it). */
const upsertAccount = (current: { items: Account[] } | undefined, account: Account) =>
  current ? { items: current.items.some((a) => a.id === account.id) ? current.items.map((a) => (a.id === account.id ? account : a)) : [...current.items, account] } : current;

/** createAccount: pessimistic, with an idempotency key. Seeds the detail and appends to the directory. */
export function useCreateAccount() {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'createAccount'],
    mutationFn: ({ account, idempotencyKey }: { account: AccountInput; idempotencyKey: string }) => {
      refuseUnless(grant, 'account:create');
      return postAccount(tenant, account, idempotencyKey);
    },
    onSuccess: (created) => {
      client.setQueryData(accountKeys.detail(tenant, created.id), created);
      client.setQueryData<{ items: Account[] }>(accountKeys.list(tenant), (current) => upsertAccount(current, created));
      return client.invalidateQueries({ queryKey: accountKeys.list(tenant) });
    },
  });
}

/**
 * updateAccount: pessimistic, versioned (a stale edit gets a 409). Writes the server's answer to the
 * detail and to its entry in the directory. Nothing else needs to change: records reference the
 * account by id, so every row, card and property that shows its name re-renders from the directory.
 */
export function useUpdateAccount(id: string) {
  const tenant = useTenant();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'updateAccount', { id }],
    mutationFn: ({ changes, version }: { changes: Partial<AccountInput>; version: number }) => {
      refuseUnless(grant, 'account:edit');
      return patchAccount(tenant, id, changes, version);
    },
    onSuccess: (updated) => {
      client.setQueryData(accountKeys.detail(tenant, id), updated);
      client.setQueryData<{ items: Account[] }>(accountKeys.list(tenant), (current) => upsertAccount(current, updated));
    },
  });
}
