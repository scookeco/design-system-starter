/**
 * Keeping the store fresh: how the cache learns about changes this client didn't make.
 *
 *   baseline   refetch on window focus and on reconnect, with a 30 s staleTime (providers.tsx):
 *              enough for most CRUD screens on its own
 *   push       live events (src/app/api/live.ts), reconciled here by ONE handler with the same
 *              policy as the mutations: patch what an event fully describes, invalidate what it
 *              might change (membership, order, totals)
 *
 * The rule for lists: never reorder rows under the person's cursor. So an event
 *   record.updated   patches the record in place (detail, and every cached list page holding it)
 *                    and marks lists stale WITHOUT refetching the one on screen; counts refetch
 *   record.created   inserts nothing: it's counted as new, and the list offers "Show 3 new"
 *   record.deleted   removes the row from every cached page (nothing can be done to it anyway)
 *                    and tells an open record page it's gone
 * The next list answer from the server (Show N new, a filter change, a focus refetch) includes
 * everything, and clears the "new" count.
 *
 * Events are idempotent and order-safe: an update applies only if its version is newer than the
 * cached one, so a replayed or late event, or the echo of this client's own write, changes nothing.
 */
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { parseLiveEvent, type LiveEvent, type LiveSource } from '../api/live';
import type { RecordPage } from '../api/schemas';
import { usePartition, useSession } from '../session';
import { useTenant } from '../tenant';
import { recordKeys, type Partition } from './keys';
import { patchListedRecord } from './mutations';
import { confirmRecord } from './writeQueue';

/** What the live channel has told one partition since its lists were last fetched. */
export interface LiveActivity {
  /** Records created elsewhere that the lists on screen don't show yet. */
  newIds: readonly string[];
  /** Records deleted elsewhere (an open record page says so). */
  deletedIds: readonly string[];
  /** When the last event touched this partition (ms), and whose change it was (a person id). */
  lastAt: number | undefined;
  lastBy: string | undefined;
}

const NO_ACTIVITY: LiveActivity = { newIds: [], deletedIds: [], lastAt: undefined, lastBy: undefined };

/**
 * Per-cache store of live activity, beside the QueryClient (one per client, so a test's or a
 * story's fresh cache starts with none). Immutable snapshots, for useSyncExternalStore.
 */
class LiveStore {
  private activity = new Map<string, LiveActivity>();
  private listeners = new Set<() => void>();

  get = (partition: Partition): LiveActivity => this.activity.get(partition.join('|')) ?? NO_ACTIVITY;

  update = (partition: Partition, change: (current: LiveActivity) => LiveActivity) => {
    const next = change(this.get(partition));
    if (next === this.get(partition)) return;
    this.activity.set(partition.join('|'), next);
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

const stores = new WeakMap<QueryClient, LiveStore>();
const storeFor = (client: QueryClient) => {
  let store = stores.get(client);
  if (!store) {
    store = new LiveStore();
    stores.set(client, store);
  }
  return store;
};

/**
 * THE reconcile step for pushed changes. `self` is the signed-in person's id: their own create,
 * echoed back by the server, is already in the lists their mutation invalidated, so it isn't "new".
 */
export function reconcileLiveEvent(client: QueryClient, partition: Partition, event: LiveEvent, self: string, now = Date.now()) {
  const store = storeFor(client);
  const touched = (current: LiveActivity): LiveActivity => ({ ...current, lastAt: now, lastBy: event.by });
  const lists = recordKeys.lists(partition);

  if (event.type === 'record.updated') {
    const { record } = event;
    // Through the write queue: pending local edits are replayed on top of the newer record.
    confirmRecord(client, partition, record);
    patchListedRecord(client, partition, record.id, (listed) => (listed.version < record.version ? record : undefined));
  } else if (event.type === 'record.created') {
    if (event.by !== self) store.update(partition, (current) => (current.newIds.includes(event.record.id) ? current : { ...current, newIds: [...current.newIds, event.record.id] }));
  } else {
    const { id } = event;
    client.setQueriesData<RecordPage>({ queryKey: lists }, (page) =>
      page?.items.some((r) => r.id === id) ? { ...page, items: page.items.filter((r) => r.id !== id), total: Math.max(0, page.total - 1) } : undefined,
    );
    store.update(partition, (current) => ({ ...current, newIds: current.newIds.filter((n) => n !== id), deletedIds: [...current.deletedIds, id] }));
  }
  store.update(partition, touched);
  // Membership, order and totals may have changed: mark every list stale, but refetch none that is
  // on screen (that would reorder rows under the cursor). Counts are safe to refetch now.
  void client.invalidateQueries({ queryKey: lists, refetchType: 'none' });
  void client.invalidateQueries({ queryKey: recordKeys.counts(partition) });
}

/**
 * Subscribe to the live source for the active workspace. Mounted once, inside the tenant boundary
 * (SessionProvider), so switching workspace or signing out unsubscribes, and a late event for the
 * old workspace can never land in the new one's partition.
 */
export function useLiveSubscription(source: LiveSource | undefined) {
  const client = useQueryClient();
  const tenant = useTenant();
  const partition = usePartition();
  const self = useSession().user.id;

  useEffect(() => {
    if (!source) return;
    return source.subscribe(tenant, (data) => {
      const event = parseLiveEvent(data);
      if (event) reconcileLiveEvent(client, partition, event, self);
    });
  }, [source, client, tenant, partition, self]);

  // A fresh list answer from the server holds every new record: the "new" count starts again.
  useEffect(() => {
    const prefix = recordKeys.lists(partition);
    return client.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
      if (prefix.every((part, i) => event.query.queryKey[i] === part)) storeFor(client).update(partition, (current) => (current.newIds.length === 0 ? current : { ...current, newIds: [] }));
    });
  }, [client, partition]);
}

/** What the live channel has changed in this workspace since the lists were fetched. */
export function useLiveActivity(): LiveActivity {
  const client = useQueryClient();
  const partition = usePartition();
  const store = storeFor(client);
  return useSyncExternalStore(
    store.subscribe,
    () => store.get(partition),
    () => store.get(partition),
  );
}

/** "Show 3 new": refetch the lists on screen now. The fresh answer clears the new count. */
export function useShowNewRecords() {
  const client = useQueryClient();
  const partition = usePartition();
  return useCallback(() => client.invalidateQueries({ queryKey: recordKeys.lists(partition) }), [client, partition]);
}

/** Whether someone else deleted this record while it was open. */
export function useDeletedElsewhere(id: string) {
  return useLiveActivity().deletedIds.includes(id);
}

