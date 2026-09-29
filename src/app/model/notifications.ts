/**
 * Notifications: keys (under the partition), reads, the named mutations, and what a pushed
 * notification does to the cache. One module beside its API, like the inbox.
 *
 *   verb                  presents     patches                                   invalidates
 *   markNotificationsRead optimistic   the items and unread counts, every cached  notification lists
 *   (read or unread)      (a person's own cheap, frequent action; rolls back)
 *   markAllRead           pessimistic  every cached list: all read, unread 0      notification lists
 *                         (the server marks what this client hasn't loaded too)
 *
 * Pushed (live) notifications follow the lists' rule: rows never move under the cursor. The counts
 * change at once (the bell), lists are marked stale without refetching the one on screen, and the
 * page offers "Show 2 new". A list opened after that (the bell's popover) reads fresh.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { listNotifications, postAllNotificationsRead, postNotificationsRead, type Notification, type NotificationList, type NotificationQuery } from '../api/notifications';
import { usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';
import { refetchAfterWrite } from './refetch';

export const notificationKeys = {
  /** Every view and kind, and their counts. */
  all: (p: Partition) => [...p, 'notifications'] as const,
  list: (p: Partition, query: NotificationQuery) => [...p, 'notifications', query] as const,
};

/** The bell reads the unread list: its count, and the latest few. */
export const BELL_QUERY: NotificationQuery = { view: 'unread', kind: '' };

export function useNotifications(query: NotificationQuery) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: notificationKeys.list(partition, query), queryFn: ({ signal }) => listNotifications(tenant, query, signal) });
}

/** markNotificationsRead: open one (read), or keep one to come back to (unread). Optimistic: it has to feel instant. */
export function useMarkNotificationsRead() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'markNotificationsRead'],
    mutationFn: ({ ids, read }: { ids: readonly string[]; read: boolean }) => postNotificationsRead(tenant, ids, read),
    onMutate: async ({ ids, read }) => {
      await client.cancelQueries({ queryKey: notificationKeys.all(partition) });
      const snapshots = client.getQueriesData<NotificationList>({ queryKey: notificationKeys.all(partition) });
      // How many actually change, from any list that holds them (the same item may be in several).
      const known = new Map<string, Notification>();
      for (const [, list] of snapshots) for (const item of list?.items ?? []) if (ids.includes(item.id)) known.set(item.id, item);
      const delta = [...known.values()].filter((n) => n.read !== read).length * (read ? -1 : 1);
      for (const [key, list] of snapshots) {
        if (!list) continue;
        // An unread list keeps a just-read row until it's refetched: it doesn't vanish under the cursor.
        const items = list.items.map((n) => (ids.includes(n.id) ? { ...n, read } : n));
        client.setQueryData<NotificationList>(key, { items, counts: { ...list.counts, unread: Math.max(0, list.counts.unread + delta) } });
      }
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, list] of context?.snapshots ?? []) client.setQueryData(key, list);
    },
    // Optimistic: it cancelled its reads in onMutate. Stale, not refetched: a row just read stays on
    // an Unread list until the person moves on (the next visit or Show new reads the truth).
    onSettled: () => client.invalidateQueries({ queryKey: notificationKeys.all(partition), refetchType: 'none' }),
  });
}

/** markAllRead: pessimistic. The server marks everything, loaded or not; every cached list follows its answer. */
export function useMarkAllNotificationsRead() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'markAllNotificationsRead'],
    mutationFn: () => postAllNotificationsRead(tenant),
    onSuccess: () =>
      refetchAfterWrite(client, notificationKeys.all(partition), () =>
        client.setQueriesData<NotificationList>({ queryKey: notificationKeys.all(partition) }, (list) =>
          list ? { items: list.items.map((n) => ({ ...n, read: true })), counts: { ...list.counts, unread: 0 } } : list,
        ),
      ),
  });
}

/** Pushed notifications not yet shown in the lists on screen, per partition, beside the cache. */
class NewNotifications {
  private ids = new Map<string, readonly string[]>();
  private listeners = new Set<() => void>();
  get = (partition: Partition) => this.ids.get(partition.join('|')) ?? NONE;
  set = (partition: Partition, next: readonly string[]) => {
    this.ids.set(partition.join('|'), next);
    this.listeners.forEach((l) => l());
  };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
const NONE: readonly string[] = [];
const stores = new WeakMap<QueryClient, NewNotifications>();
const storeFor = (client: QueryClient) => {
  let store = stores.get(client);
  if (!store) {
    store = new NewNotifications();
    stores.set(client, store);
  }
  return store;
};

/**
 * A notification pushed on the live channel (src/app/model/live.ts hands it here). Idempotent: a
 * replayed one counts once. Counts move at once; rows don't.
 */
export function reconcileNotification(client: QueryClient, partition: Partition, notification: Notification) {
  const store = storeFor(client);
  if (store.get(partition).includes(notification.id)) return;
  const lists = client.getQueriesData<NotificationList>({ queryKey: notificationKeys.all(partition) });
  if (lists.some(([, list]) => list?.items.some((n) => n.id === notification.id))) return;
  store.set(partition, [...store.get(partition), notification.id]);
  client.setQueriesData<NotificationList>({ queryKey: notificationKeys.all(partition) }, (list) =>
    list ? { ...list, counts: { all: list.counts.all + 1, unread: list.counts.unread + (notification.read ? 0 : 1) } } : list,
  );
  void client.invalidateQueries({ queryKey: notificationKeys.all(partition), refetchType: 'none' });
}

/** How many pushed notifications the lists on screen don't show yet, and "Show N new". */
export function useNewNotifications() {
  const client = useQueryClient();
  const partition = usePartition();
  const store = storeFor(client);
  const ids = useSyncExternalStore(
    store.subscribe,
    () => store.get(partition),
    () => store.get(partition),
  );
  const show = useCallback(() => {
    store.set(partition, NONE);
    return client.invalidateQueries({ queryKey: notificationKeys.all(partition) });
  }, [client, partition, store]);
  return { count: ids.length, show };
}
