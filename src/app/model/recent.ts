/**
 * Recently opened things, for the command palette's empty state. Kept in the query cache under the
 * partition, on purpose: it then follows the same boundaries as everything else. A workspace
 * switch shows that workspace's recents, a permission change drops them with the old scope's
 * partition, and sign-out clears them with the rest of the cache. Nothing is written to storage.
 *
 * Only ids are kept: names are joined at render from the directories and the record cache, so a
 * renamed record shows its new name here too.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { usePartition } from '../session';

export type RecentKind = 'page' | 'record' | 'account' | 'person';

export interface RecentItem {
  kind: RecentKind;
  /** The record, account or person id; a page's path. */
  id: string;
  href: string;
}

const MAX_RECENT = 5;
const recentKey = (partition: readonly [string, string]) => [...partition, 'recent', {}] as const;

/** The recents (newest first) and a function that puts one at the top. */
export function useRecentItems(): [readonly RecentItem[], (item: RecentItem) => void] {
  const partition = usePartition();
  const client = useQueryClient();
  const key = recentKey(partition);
  // A query with no server behind it: the cache is only the store. Never stale, never collected.
  const { data = [] } = useQuery({ queryKey: key, queryFn: () => [] as RecentItem[], staleTime: Infinity, gcTime: Infinity, initialData: [] as RecentItem[] });
  const remember = useCallback(
    (item: RecentItem) =>
      client.setQueryData<RecentItem[]>(recentKey(partition), (list = []) => [item, ...list.filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, MAX_RECENT)),
    [client, partition],
  );
  return [data, remember];
}
