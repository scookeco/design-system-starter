/**
 * Writes. One named mutation per domain verb; components call these and never touch the cache.
 * The list of hooks here *is* the domain's verb list. Each one documents its presentation
 * (optimistic or pessimistic) and exactly which cache entries it patches and invalidates:
 * Every write to one record goes through that record's write queue (src/app/model/writeQueue.ts):
 * serialised, each sent on the latest confirmed version, the preview rebased when one fails.
 *
 *   verb               presents     patches                           invalidates
 *   renameRecord       optimistic   detail + every cached list page   detail, lists   (counts can't change)
 *                                   holding it (rebased on failure)
 *   updateRecord       pessimistic  detail + listed copies (answer)   lists           (versioned, If-Match; a 409
 *                                   on a 409: detail := theirs                        with no field changed on
 *                                                                                     both sides is re-based once)
 *   moveRecord         pessimistic  detail + listed copies (answer)   lists, counts   (board column)
 *   archiveRecord      optimistic,  detail + listed copies (preview)  lists, counts   (held for the undo
 *                      undoable                                                       window; Undo drops it)
 *   restoreRecord      optimistic   detail + listed copies (preview)  lists, counts   (Undo, once sent)
 *   tagRecord ·        optimistic   detail + listed copies (preview)  lists           (untag is held for the
 *   untagRecord        (undoable)                                                     undo window)
 *   createRecord       pessimistic  detail (server's answer)   lists, counts        (idempotency key)
 *   bulkDeleteRecords  pessimistic  removes deleted details    lists, counts        (listed ids)
 *   startBulkDelete    pessimistic  jobs (appends, queued)     nothing yet: the job's polls refetch lists
 *                                                              and counts as it deletes ("all matching")
 *   cancelJob          pessimistic  jobs (the entry)           jobs
 *   dismissJob         pessimistic  jobs (removes)             nothing
 *   addPerson          pessimistic  people (appends)           people
 *   createAccount      pessimistic  directory (appends), detail  directory       (idempotency key)
 *   updateAccount      pessimistic  directory entry, detail      nothing else: records hold the id, so
 *                                                               every join re-renders from the directory
 *   saveView           pessimistic  views (appends)                  views
 *   updateView         pessimistic  views (the entry; default moves) views     (rename, save changes, default)
 *   deleteView         pessimistic  views (removes)                  views
 */
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { patchAccount, postAccount, type AccountInput } from '../api/accounts';
import { deleteJob, postBulkDeleteJob, postCancelJob } from '../api/jobs';
import { deleteView, patchView, postView } from '../api/views';
import { patchRecord, postArchive, postBulkDelete, patchRecordName, postPerson, postRecord, postRestore, postStatus, type NewRecord, type RecordChanges } from '../api/records';
import type { Account, Capability, Job, MovableStatus, SavedView, SavedViewConfig, Person, RecordEntity, RecordFilter, RecordPage } from '../api/schemas';
import { useGrant, usePartition } from '../session';
import { useTenant } from '../tenant';
import { can, DENIAL_REASONS, type Grant } from './permissions';
import { applyChanges, compareVersions, realConflicts } from './conflicts';
import { accountKeys, jobKeys, recordKeys, viewKeys, type Partition } from './keys';
import { isSystemTag } from './predicates';
import { confirmRecord, isCancelled, writeQueues } from './writeQueue';

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
export const patchListedRecord = (client: QueryClient, partition: Partition, id: string, patch: (listed: RecordEntity) => RecordEntity | undefined) =>
  client.setQueriesData<RecordPage>({ queryKey: recordKeys.lists(partition) }, (page) => {
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

/** The record as the server has it now, from a 409 (theirs), if the server sent it. */
export const conflictingRecord = (error: unknown): RecordEntity | undefined =>
  isConflict(error) && error.current && 'status' in error.current ? error.current : undefined;

/** An edit from the form: what changed, and the version of the record it started from. */
export interface RecordEdit {
  base: RecordEntity;
  changes: RecordChanges;
}

/**
 * updateRecord: pessimistic and versioned. Sends If-Match with the version the edit started from
 * (the draft's base), not whatever the cache holds now, so a change someone made while the form
 * was open is caught, never overwritten.
 *
 * On a 409, the server's current record ("theirs") is compared with the base and the edit, field by
 * field (src/app/model/conflicts.ts). If no field was changed on both sides, the edit is re-based on
 * their version and sent again, once: both changes stand. If one was, the 409 reaches the page with
 * `current`, and the person decides (Keep mine, Take theirs, or field by field). Either way the
 * detail entry takes their version, which is confirmed data.
 */
export function useUpdateRecord(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  const key = recordKeys.detail(partition, id);
  return useMutation({
    mutationKey: [...partition, 'updateRecord', { id }],
    mutationFn: ({ base, changes }: RecordEdit) => {
      refuseUnless(grant, 'record:edit', client.getQueryData<RecordEntity>(key) ?? base);
      // Through the record's write queue, so it never overlaps a rename or a move; but based on the
      // draft's version, not the latest, because catching a change made meanwhile is the point.
      return writeQueues(client).enqueue(partition, id, {
        label: 'Saving your changes…',
        send: async () => {
          try {
            return await patchRecord(tenant, id, changes, base.version);
          } catch (error) {
            const theirs = conflictingRecord(error);
            if (!theirs || realConflicts(compareVersions(base, applyChanges(base, changes), theirs)).length > 0) throw error;
            return patchRecord(tenant, id, changes, theirs.version);
          }
        },
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: recordKeys.lists(partition) }),
    onError: (error) => {
      const theirs = conflictingRecord(error);
      if (theirs) confirmRecord(client, partition, theirs);
    },
  });
}

/**
 * renameRecord: optimistic, through the record's write queue (src/app/model/writeQueue.ts). The new
 * name shows at once, in the detail and every listed copy; rapid renames are sent one at a time,
 * each on the version the previous one produced, so none is lost and none 409s against another. A
 * failure drops only this rename and replays anything queued after it on the confirmed record.
 * A 409 means someone else changed it: the page shows their version (see conflicts.ts).
 */
export function useRenameRecord(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  const key = recordKeys.detail(partition, id);
  return useMutation({
    mutationKey: [...partition, 'renameRecord', { id }],
    mutationFn: ({ name, version }: { name: string; version: number }) => {
      // Refused before the optimistic preview, so a denied rename never flashes the new name.
      refuseUnless(grant, 'record:rename', client.getQueryData<RecordEntity>(key));
      return writeQueues(client).enqueue(partition, id, {
        label: 'Saving the new name…',
        apply: (record) => ({ ...record, name }),
        send: (latest) => patchRecordName(tenant, id, name, latest),
        fallbackVersion: version,
      });
    },
    onMutate: async () => {
      // A read in flight must not land on top of the preview: not the detail, not a list.
      await Promise.all([client.cancelQueries({ queryKey: key, exact: true }), client.cancelQueries({ queryKey: recordKeys.lists(partition) })]);
    },
    // Returning the promise keeps the mutation pending until the refetch lands. After a conflict the
    // detail is left alone: the page says so and the person chooses.
    onSettled: (_data, error) =>
      Promise.all([
        isConflict(error) ? undefined : client.invalidateQueries({ queryKey: key, exact: true }),
        client.invalidateQueries({ queryKey: recordKeys.lists(partition) }),
      ]),
  });
}

/**
 * moveRecord: pessimistic, through the record's write queue. A board's "Move to…" (or a drop): the
 * new status, versioned. Takes the record per call, so one hook serves every card on a board.
 */
export function useMoveRecord() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'moveRecord'],
    /**
     * `asRead`: send the version on `record` as If-Match, not the latest confirmed one. For a move
     * decided from a snapshot (an assistant's proposal): if the record changed since it was read, the
     * server refuses with a 409 instead of the move landing on a record nobody reviewed.
     */
    mutationFn: ({ record, status, asRead = false }: { record: Pick<RecordEntity, 'id' | 'version'>; status: MovableStatus; asRead?: boolean }) => {
      refuseUnless(grant, 'record:move', client.getQueryData<RecordEntity>(recordKeys.detail(partition, record.id)));
      return writeQueues(client).enqueue(partition, record.id, {
        label: 'Moving…',
        send: (latest) => postStatus(tenant, record.id, status, asRead ? record.version : latest),
        fallbackVersion: record.version,
      });
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(partition) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(partition) }),
      ]),
  });
}

/** Lists and counts: what a status or tag change can move rows between. */
const invalidateListsAndCounts = (client: QueryClient, partition: Partition) =>
  Promise.all([client.invalidateQueries({ queryKey: recordKeys.lists(partition) }), client.invalidateQueries({ queryKey: recordKeys.counts(partition) })]);

/**
 * archiveRecord: optimistic, undoable, through the record's write queue. Pass the undo window's
 * `hold` (src/app/model/undo.ts): the record shows as archived at once, and the request waits for
 * the window; Undo inside it drops the write unsent (the mutation fails with WriteCancelled).
 * Without a hold, it's sent at once.
 */
export function useArchiveRecord(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'archiveRecord', { id }],
    mutationFn: ({ hold }: { hold?: Promise<void> }) => {
      refuseUnless(grant, 'record:archive', client.getQueryData<RecordEntity>(recordKeys.detail(partition, id)));
      return writeQueues(client).enqueue(partition, id, {
        label: 'Archiving…',
        apply: (record) => ({ ...record, status: 'archived' }),
        ...(hold ? { hold } : {}),
        send: () => postArchive(tenant, id),
      });
    },
    onSettled: (_data, error) => (isCancelled(error) ? undefined : invalidateListsAndCounts(client, partition)),
  });
}

/** restoreRecord: optimistic, through the queue. Undo for an archive that was already sent: back to its status. */
export function useRestoreRecord(id: string) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'restoreRecord', { id }],
    mutationFn: ({ status }: { status: MovableStatus }) => {
      refuseUnless(grant, 'record:archive');
      return writeQueues(client).enqueue(partition, id, {
        label: 'Restoring…',
        apply: (record) => ({ ...record, status }),
        send: (latest) => postRestore(tenant, id, status, latest),
      });
    },
    onSettled: () => invalidateListsAndCounts(client, partition),
  });
}

/**
 * tagRecord / untagRecord: optimistic, through the queue; untag is undoable like archive (pass the
 * undo window's hold), and tagging is its compensation. Each sends the whole tag list worked out at
 * SEND time from the latest confirmed record, so it never undoes a tag change queued before it.
 * Legal hold is not a person's to change (isSystemTag): refused here and by the server.
 */
export function useUntagRecord(id: string) {
  return useTagWrite(id, 'remove');
}

export function useTagRecord(id: string) {
  return useTagWrite(id, 'add');
}

function useTagWrite(id: string, change: 'add' | 'remove') {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  const next = (tags: readonly string[], tag: string) => (change === 'add' ? (tags.includes(tag) ? [...tags] : [...tags, tag]) : tags.filter((t) => t !== tag));
  return useMutation({
    mutationKey: [...partition, change === 'add' ? 'tagRecord' : 'untagRecord', { id }],
    mutationFn: ({ tag, hold }: { tag: string; hold?: Promise<void> }) => {
      refuseUnless(grant, 'record:edit', client.getQueryData<RecordEntity>(recordKeys.detail(partition, id)));
      if (isSystemTag(tag)) throw new ApiError(403, 'forbidden', 'Legal hold is set and lifted by legal.');
      return writeQueues(client).enqueue(partition, id, {
        label: change === 'add' ? 'Adding the tag…' : 'Removing the tag…',
        apply: (record) => ({ ...record, tags: next(record.tags, tag) }),
        ...(hold ? { hold } : {}),
        send: (latest, confirmed) => patchRecord(tenant, id, { tags: next(confirmed?.tags ?? [], tag) }, latest),
      });
    },
    onSettled: (_data, error) => (isCancelled(error) ? undefined : client.invalidateQueries({ queryKey: recordKeys.lists(partition) })),
  });
}

/**
 * createRecord: pessimistic. Carries an idempotency key, so a retry or a double submit makes one
 * record: the caller keeps the same key until the create succeeds. On success: seeds the new
 * record's detail entry, invalidates every list and count.
 */
export function useCreateRecord() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'createRecord'],
    mutationFn: ({ record, idempotencyKey }: { record: NewRecord; idempotencyKey: string }) => {
      refuseUnless(grant, 'record:create');
      return postRecord(tenant, record, idempotencyKey);
    },
    onSuccess: (created) => {
      client.setQueryData(recordKeys.detail(partition, created.id), created);
      return Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(partition) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(partition) }),
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
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'bulkDeleteRecords'],
    mutationFn: (selection: BulkSelection) => {
      refuseUnless(grant, 'record:delete');
      return postBulkDelete(tenant, selection);
    },
    onSuccess: (result) => {
      for (const id of result.deleted) client.removeQueries({ queryKey: recordKeys.detail(partition, id), exact: true });
      return Promise.all([
        client.invalidateQueries({ queryKey: recordKeys.lists(partition) }),
        client.invalidateQueries({ queryKey: recordKeys.counts(partition) }),
      ]);
    },
  });
}

/** addPerson: pessimistic. The quick-create for an owner: appends the new person, then refetches people. */
export function useAddPerson() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'addPerson'],
    mutationFn: (name: string) => {
      refuseUnless(grant, 'people:create');
      return postPerson(tenant, name);
    },
    onSuccess: (person) => {
      client.setQueryData<{ items: Person[] }>(recordKeys.people(partition), (current) => (current ? { items: [...current.items, person] } : current));
      return client.invalidateQueries({ queryKey: recordKeys.people(partition) });
    },
  });
}

/** Put one account into the directory (replacing it by id, or appending it). */
const upsertAccount = (current: { items: Account[] } | undefined, account: Account) =>
  current ? { items: current.items.some((a) => a.id === account.id) ? current.items.map((a) => (a.id === account.id ? account : a)) : [...current.items, account] } : current;

/** createAccount: pessimistic, with an idempotency key. Seeds the detail and appends to the directory. */
export function useCreateAccount() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'createAccount'],
    mutationFn: ({ account, idempotencyKey }: { account: AccountInput; idempotencyKey: string }) => {
      refuseUnless(grant, 'account:create');
      return postAccount(tenant, account, idempotencyKey);
    },
    onSuccess: (created) => {
      client.setQueryData(accountKeys.detail(partition, created.id), created);
      client.setQueryData<{ items: Account[] }>(accountKeys.list(partition), (current) => upsertAccount(current, created));
      return client.invalidateQueries({ queryKey: accountKeys.list(partition) });
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
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'updateAccount', { id }],
    mutationFn: ({ changes, version }: { changes: Partial<AccountInput>; version: number }) => {
      refuseUnless(grant, 'account:edit');
      return patchAccount(tenant, id, changes, version);
    },
    onSuccess: (updated) => {
      client.setQueryData(accountKeys.detail(partition, id), updated);
      client.setQueryData<{ items: Account[] }>(accountKeys.list(partition), (current) => upsertAccount(current, updated));
    },
  });
}

type Views = { items: SavedView[] };

/** saveView: pessimistic. A new named view of the list; appended once the server has it. */
export function useSaveView() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'saveView'],
    mutationFn: (view: { name: string; config: SavedViewConfig }) => postView(tenant, view),
    onSuccess: (saved) => {
      client.setQueryData<Views>(viewKeys.list(partition), (current) => (current ? { items: [...current.items, saved] } : current));
      return client.invalidateQueries({ queryKey: viewKeys.list(partition) });
    },
  });
}

/** updateView: pessimistic. Rename, save the current state into it, or make it the default (one per person). */
export function useUpdateView() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'updateView'],
    mutationFn: ({ id, changes }: { id: string; changes: Partial<{ name: string; config: SavedViewConfig; isDefault: boolean }> }) => patchView(tenant, id, changes),
    onSuccess: (updated) => {
      client.setQueryData<Views>(viewKeys.list(partition), (current) =>
        current ? { items: current.items.map((v) => (v.id === updated.id ? updated : updated.isDefault ? { ...v, isDefault: false } : v)) } : current,
      );
      return client.invalidateQueries({ queryKey: viewKeys.list(partition) });
    },
  });
}

/** deleteView: pessimistic, confirmed by the caller. */
export function useDeleteView() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'deleteView'],
    mutationFn: (id: string) => deleteView(tenant, id),
    onSuccess: ({ deleted }) => {
      client.setQueryData<Views>(viewKeys.list(partition), (current) => (current ? { items: current.items.filter((v) => v.id !== deleted) } : current));
      return client.invalidateQueries({ queryKey: viewKeys.list(partition) });
    },
  });
}


type Jobs = { items: Job[] };

/**
 * startBulkDelete: a bulk delete over "all N matching" (or a retry of the ids that failed) as a
 * job. The answer is the job, queued (202): it's appended to the person's jobs and the shell shows
 * its progress from then on. Nothing is deleted, or said to be, until the job reports it.
 */
export function useStartBulkDelete() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'startBulkDelete'],
    mutationFn: (selection: { filter: RecordFilter; label: string } | { ids: readonly string[]; label: string }) => {
      refuseUnless(grant, 'record:delete');
      return postBulkDeleteJob(tenant, selection);
    },
    onSuccess: (job) => {
      client.setQueryData<Jobs>(jobKeys.list(partition), (current) => ({ items: [job, ...(current?.items ?? []).filter((j) => j.id !== job.id)] }));
    },
  });
}

/** cancelJob: pessimistic. Stops between chunks; what's done stays done, and the job says how far it got. */
export function useCancelJob() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'cancelJob'],
    mutationFn: (id: string) => postCancelJob(tenant, id),
    onSuccess: (job) => {
      client.setQueryData<Jobs>(jobKeys.list(partition), (current) => (current ? { items: current.items.map((j) => (j.id === job.id ? job : j)) } : current));
      return Promise.all([client.invalidateQueries({ queryKey: recordKeys.lists(partition) }), client.invalidateQueries({ queryKey: recordKeys.counts(partition) })]);
    },
  });
}

/** dismissJob: pessimistic. A finished job the person has read leaves their list. */
export function useDismissJob() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'dismissJob'],
    mutationFn: (id: string) => deleteJob(tenant, id),
    onSuccess: ({ dismissed }) => {
      client.setQueryData<Jobs>(jobKeys.list(partition), (current) => (current ? { items: current.items.filter((j) => j.id !== dismissed) } : current));
    },
  });
}
