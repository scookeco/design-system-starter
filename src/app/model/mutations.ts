/**
 * Writes. One named mutation per domain verb; components call these and never touch the cache.
 * The list of hooks here *is* the domain's verb list. Each one documents its presentation
 * (optimistic or pessimistic) and exactly which cache entries it patches and invalidates:
 *
 *   verb               presents     patches                    invalidates
 *   renameRecord       optimistic   detail (then rolls back)   detail, lists        (counts can't change)
 *   moveRecord         pessimistic  detail (server's answer)   lists, counts        (board column)
 *   archiveRecord      pessimistic  detail (server's answer)   lists, counts
 *   createRecord       pessimistic  detail (server's answer)   lists, counts        (idempotency key)
 *   bulkDeleteRecords  pessimistic  removes deleted details    lists, counts
 *   addPerson          pessimistic  people (appends)           people
 *   createAccount      pessimistic  directory (appends), detail  directory       (idempotency key)
 *   updateAccount      pessimistic  directory entry, detail      nothing else: records hold the id, so
 *                                                               every join re-renders from the directory
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { patchAccount, postAccount, type AccountInput } from '../api/accounts';
import { postArchive, postBulkDelete, patchRecordName, postPerson, postRecord, postStatus, type NewRecord } from '../api/records';
import type { Account, MovableStatus, Person, RecordEntity, RecordFilter } from '../api/schemas';
import { useTenant } from '../tenant';
import { accountKeys, recordKeys } from './keys';

/** A 409: someone else changed the record since this client read it. */
export const isConflict = (error: unknown): error is ApiError => error instanceof ApiError && error.status === 409;

/**
 * renameRecord: optimistic. The new name shows at once; a failure puts the previous one back,
 * unless a newer write already replaced it. Sends the version it was based on, so a stale edit
 * gets a 409 instead of silently overwriting someone else's change.
 */
export function useRenameRecord(id: string) {
  const tenant = useTenant();
  const client = useQueryClient();
  const key = recordKeys.detail(tenant, id);
  return useMutation({
    mutationKey: [tenant, 'renameRecord', { id }],
    mutationFn: ({ name, version }: { name: string; version: number }) => patchRecordName(tenant, id, name, version),
    onMutate: async ({ name }) => {
      // A read in flight must not land on top of the optimistic name.
      await client.cancelQueries({ queryKey: key, exact: true });
      const previous = client.getQueryData<RecordEntity>(key);
      if (previous) client.setQueryData<RecordEntity>(key, { ...previous, name });
      return { previous };
    },
    onError: (_error, { name }, context) => {
      const current = client.getQueryData<RecordEntity>(key);
      // Roll back only our own optimistic patch: if something newer landed, leave it.
      if (context?.previous && current?.name === name && current.version === context.previous.version) {
        client.setQueryData(key, context.previous);
      }
    },
    onSuccess: (renamed) => {
      client.setQueryData(key, renamed);
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
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'moveRecord'],
    mutationFn: ({ record, status }: { record: Pick<RecordEntity, 'id' | 'version'>; status: MovableStatus }) => postStatus(tenant, record.id, status, record.version),
    onSuccess: (moved) => {
      client.setQueryData(recordKeys.detail(tenant, moved.id), moved);
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
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'archiveRecord', { id }],
    mutationFn: () => postArchive(tenant, id),
    onSuccess: (archived) => {
      client.setQueryData(recordKeys.detail(tenant, id), archived);
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
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'createRecord'],
    mutationFn: ({ record, idempotencyKey }: { record: NewRecord; idempotencyKey: string }) => postRecord(tenant, record, idempotencyKey),
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
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'bulkDeleteRecords'],
    mutationFn: (selection: BulkSelection) => postBulkDelete(tenant, selection),
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
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'addPerson'],
    mutationFn: (name: string) => postPerson(tenant, name),
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
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'createAccount'],
    mutationFn: ({ account, idempotencyKey }: { account: AccountInput; idempotencyKey: string }) => postAccount(tenant, account, idempotencyKey),
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
  const client = useQueryClient();
  return useMutation({
    mutationKey: [tenant, 'updateAccount', { id }],
    mutationFn: ({ changes, version }: { changes: Partial<AccountInput>; version: number }) => patchAccount(tenant, id, changes, version),
    onSuccess: (updated) => {
      client.setQueryData(accountKeys.detail(tenant, id), updated);
      client.setQueryData<{ items: Account[] }>(accountKeys.list(tenant), (current) => upsertAccount(current, updated));
    },
  });
}
