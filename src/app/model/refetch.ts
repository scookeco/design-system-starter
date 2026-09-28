/**
 * Refetching what a write changed, so a read that was already in flight can't land over it.
 *
 * `invalidateQueries` alone isn't enough while a query's first load is still in flight: TanStack
 * Query cancels an in-flight fetch only when the query already has data, and otherwise joins it.
 * That read reached the server before the write, so the list it brings back lacks the write (a
 * conversation created while the history was loading was missing until the next refetch).
 * Cancelling first sends a fresh read after the write, whatever state the query was in.
 *
 * Every write that refetches goes through it (tests/unit/refetch.test.tsx holds a first load past
 * each family's write):
 *   records   updateRecord, moveRecord, archiveRecord, restoreRecord, tag/untag, createRecord,
 *             bulkDeleteRecords (lists, counts)
 *   jobs      startBulkDelete, cancelJob, dismissJob (the job list; cancel also lists and counts),
 *             and a poll that sees a job move (lists, counts)
 *   others    addPerson, createAccount, updateAccount, saveView/updateView/deleteView, the admin
 *             writes, the assistant's conversations (model/ai.ts), counts after a live event
 *
 * Left out on purpose:
 *   renameRecord and inbox triage are optimistic and cancel their reads in onMutate;
 *   a live event marks lists stale without refetching them (live.ts, refetchType 'none');
 *   "Show N new" refetches lists already on screen, which have data, so invalidating restarts them.
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Cancel reads of `queryKey` still in flight, apply `patch` (the write's answer, into the cache),
 * then invalidate so they refetch. Patch here, not before: cancelling puts a query back to where
 * its fetch began, which would undo an earlier patch.
 */
export const refetchAfterWrite = async (client: QueryClient, queryKey: QueryKey, patch?: () => void) => {
  await client.cancelQueries({ queryKey });
  patch?.();
  return client.invalidateQueries({ queryKey });
};
