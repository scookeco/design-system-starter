/**
 * The inbox domain: its keys (under the partition), its read and its named mutations, in one
 * module beside its API. Triage is optimistic: it's a person's own frequent, cheap-to-reverse
 * action, and j/k/e triage has to feel instant.
 *
 *   verb            presents     patches                                     invalidates
 *   markRead        optimistic   the item in every cached inbox view, counts  inbox views
 *   markUnread      optimistic   the same                                     inbox views
 *   archive         optimistic   removes it from Inbox, counts (rolls back)   inbox views
 *   unarchive       optimistic   removes it from Archived, counts             inbox views
 * Each takes one id or many: bulk triage is the same verb.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { listInbox, postTriage, type InboxItem, type InboxList, type InboxView, type TriageAction } from '../api/inbox';
import { useGrant, usePartition } from '../session';
import { can, DENIAL_REASONS, type Grant } from './permissions';
import { useTenant } from '../tenant';
import type { Partition } from './keys';

export const inboxKeys = {
  /** Both views (Inbox, Archived) and their counts. */
  all: (p: Partition) => [...p, 'inbox'] as const,
  view: (p: Partition, view: InboxView) => [...p, 'inbox', { view }] as const,
};

/** One view of the inbox, with the server's counts. */
export function useInbox(view: InboxView) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: inboxKeys.view(partition, view), queryFn: ({ signal }) => listInbox(tenant, view, signal) });
}

/** What an action does to an item, and to the view it's listed in. The server applies the same rule. */
const APPLY: Record<TriageAction, (item: InboxItem) => InboxItem> = {
  read: (item) => ({ ...item, read: true }),
  unread: (item) => ({ ...item, read: false }),
  archive: (item) => ({ ...item, archived: true, read: true }),
  unarchive: (item) => ({ ...item, archived: false }),
};

const recount = (list: InboxList, view: InboxView, before: readonly InboxItem[], after: readonly InboxItem[]): InboxList['counts'] => {
  const counts = { ...list.counts };
  for (const [i, old] of before.entries()) {
    const next = after[i] as InboxItem;
    if (view === 'inbox' || !old.archived) {
      if (!old.archived && !old.read) counts.unread -= 1;
      if (!next.archived && !next.read) counts.unread += 1;
    }
    if (!old.archived && next.archived) {
      counts.inbox -= 1;
      counts.archived += 1;
    }
    if (old.archived && !next.archived) {
      counts.inbox += 1;
      counts.archived -= 1;
    }
  }
  return counts;
};

/** Refused here, before any request (and before the optimistic patch, so a denied triage never flashes). */
const refuseUnless = (grant: Grant) => {
  if (!can(grant, 'workspace:read')) throw new ApiError(403, 'forbidden', DENIAL_REASONS['workspace:read']);
};

function useTriage(action: TriageAction) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'triageInbox', { action }],
    mutationFn: (ids: readonly string[]) => {
      refuseUnless(grant);
      return postTriage(tenant, ids, action);
    },
    onMutate: async (ids) => {
      refuseUnless(grant);
      await client.cancelQueries({ queryKey: inboxKeys.all(partition) });
      const snapshots = client.getQueriesData<InboxList>({ queryKey: inboxKeys.all(partition) });
      for (const [key, list] of snapshots) {
        if (!list) continue;
        const view = ((key[3] as { view?: InboxView } | undefined)?.view ?? 'inbox') satisfies InboxView;
        const before = list.items.filter((item) => ids.includes(item.id));
        const after = before.map(APPLY[action]);
        const byId = new Map(after.map((item) => [item.id, item]));
        const items = list.items.map((item) => byId.get(item.id) ?? item).filter((item) => item.archived === (view === 'archived'));
        client.setQueryData<InboxList>(key, { items, counts: recount(list, view, before, after) });
      }
      return { snapshots };
    },
    // Put every view back as it was; the refetch below then brings the truth.
    onError: (_error, _ids, context) => {
      for (const [key, list] of context?.snapshots ?? []) client.setQueryData(key, list);
    },
    onSettled: () => client.invalidateQueries({ queryKey: inboxKeys.all(partition) }),
  });
}

/** markRead: opening an item, or marking a selection read. */
export const useMarkRead = () => useTriage('read');
/** markUnread: keep it on the list of things to come back to. */
export const useMarkUnread = () => useTriage('unread');
/** archive: done with it. It leaves Inbox and waits in Archived. */
export const useArchiveInbox = () => useTriage('archive');
/** unarchive: back to Inbox. */
export const useUnarchiveInbox = () => useTriage('unarchive');
