/**
 * Per-record write queues: every write to one record, from any surface (the record page, a board
 * card, the edit form, an undo), goes through that record's queue, so writes to the same record
 * never overlap.
 *
 *   serialised   one request at a time per record, in the order they were made. Each is sent with
 *                the latest version this client has CONFIRMED, including the answer to the write
 *                before it, so rapid edits never 409 against each other and none is lost
 *   pending ops  what's queued or in flight is kept apart from the confirmed record. The cache (the
 *                detail and every listed copy) shows the PREVIEW: the pending ops applied, in order,
 *                to the latest confirmed record
 *   rebase       when an op fails, only that op is dropped and the rest are replayed on the confirmed
 *                record; never a whole old snapshot over a newer success, push or refetch. A newer
 *                confirmed record from anywhere (a live event, a refetch that lands while ops are
 *                pending) becomes the base the preview is replayed on
 *   held ops     an op can wait before it sends (the undo window, src/app/model/undo.ts): it shows in
 *                the preview at once and is sent when released, or dropped if it's cancelled first
 *
 * The queues live beside the QueryClient (one set per cache), not in a component, so a write keeps
 * going when the page that started it unmounts. Sign-out drops everything not yet sent.
 */
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import type { RecordEntity, RecordPage } from '../api/schemas';
import { usePartition } from '../session';
import { recordKeys, type Partition } from './keys';

export type PendingState = 'held' | 'queued' | 'sending';

/** One write waiting for, or talking to, the server. */
export interface PendingOp {
  readonly id: number;
  /** What it does, as the page says it while it's pending ("Saving the new name…"). */
  readonly label: string;
  readonly state: PendingState;
}

export interface QueuedWrite {
  label: string;
  /** The optimistic change, applied to the confirmed record for the preview. Omit for a pessimistic write. */
  apply?: (record: RecordEntity) => RecordEntity;
  /**
   * Send it. `version` is the latest version this client has confirmed (the answer to the previous
   * write included). A write that must be based on an older version (a form's draft) ignores it.
   */
  send: (version: number) => Promise<RecordEntity>;
  /** The version to use if this client has never seen the record's detail (a card on a board). */
  fallbackVersion?: number;
  /** Wait for this before sending (the undo window). Rejecting it cancels the op. */
  hold?: Promise<void>;
}

/** A write dropped before it was sent: its hold was cancelled (Undo), or the session ended. */
export class WriteCancelled extends Error {
  constructor() {
    super('The write was cancelled before it was sent.');
    this.name = 'WriteCancelled';
  }
}

export const isCancelled = (error: unknown): error is WriteCancelled => error instanceof WriteCancelled;

interface Op extends PendingOp {
  apply: ((record: RecordEntity) => RecordEntity) | undefined;
  cancel: () => void;
}

interface Queue {
  partition: Partition;
  id: string;
  /** The latest record the server confirmed (an answer, a push, a fetch). */
  confirmed: RecordEntity | undefined;
  ops: Op[];
  /** The end of the chain: the next op starts when this settles. */
  tail: Promise<unknown>;
  /** Immutable view of `ops`, for useSyncExternalStore. */
  snapshot: readonly PendingOp[];
}

const EMPTY: readonly PendingOp[] = [];

class WriteQueues {
  private queues = new Map<string, Queue>();
  private listeners = new Set<() => void>();
  private nextOp = 1;
  private watching = false;

  constructor(private readonly client: QueryClient) {}

  private keyOf = (partition: Partition, id: string) => `${partition.join('|')}|${id}`;

  private queue(partition: Partition, id: string): Queue {
    const key = this.keyOf(partition, id);
    let queue = this.queues.get(key);
    if (!queue) {
      queue = { partition, id, confirmed: undefined, ops: [], tail: Promise.resolve(), snapshot: EMPTY };
      this.queues.set(key, queue);
    }
    return queue;
  }

  private notify(queue: Queue) {
    queue.snapshot = queue.ops.length === 0 ? EMPTY : queue.ops.map(({ id, label, state }) => ({ id, label, state }));
    this.listeners.forEach((listener) => listener());
  }

  pending = (partition: Partition, id: string): readonly PendingOp[] => this.queues.get(this.keyOf(partition, id))?.snapshot ?? EMPTY;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * The newest confirmed record: the queue's own, or a newer one the cache got some other way. With
   * no detail cached (a card on a board), a listed copy is the best confirmed record there is.
   */
  private latestConfirmed(queue: Queue): RecordEntity | undefined {
    const cached = this.client.getQueryData<RecordEntity>(recordKeys.detail(queue.partition, queue.id)) ?? (queue.confirmed ? undefined : listedCopy(this.client, queue.partition, queue.id));
    // The cache shows a preview while ops are pending, and a preview keeps the confirmed version. So
    // a cached copy with a HIGHER version was confirmed elsewhere (written straight to the cache).
    if (cached && (!queue.confirmed || cached.version > queue.confirmed.version)) queue.confirmed = cached;
    return queue.confirmed;
  }

  /** Write the preview (pending ops over the confirmed record) to the detail and every listed copy. */
  private publish(queue: Queue) {
    const confirmed = this.latestConfirmed(queue);
    if (confirmed) {
      const preview = queue.ops.reduce((record, op) => (op.apply ? op.apply(record) : record), confirmed);
      const key = recordKeys.detail(queue.partition, queue.id);
      if (this.client.getQueryData(key) !== undefined || queue.ops.length > 0) this.client.setQueryData(key, preview);
      patchListed(this.client, queue.partition, queue.id, (listed) => (listed.version <= preview.version ? preview : undefined));
    }
    this.notify(queue);
  }

  /** A newer confirmed record arrived from outside this client's writes (a live event, a fetch). */
  confirm(partition: Partition, record: RecordEntity) {
    const queue = this.queue(partition, record.id);
    const current = this.latestConfirmed(queue);
    if (current && current.version >= record.version) return;
    const cached = this.client.getQueryData<RecordEntity>(recordKeys.detail(partition, record.id));
    queue.confirmed = record;
    // Nothing pending and nothing cached: nobody is looking at it, so don't create an entry.
    if (queue.ops.length === 0 && !cached) return;
    this.publish(queue);
  }

  enqueue(partition: Partition, id: string, write: QueuedWrite): Promise<RecordEntity> {
    this.watchFetches();
    const queue = this.queue(partition, id);
    let cancel: () => void = () => undefined;
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => reject(new WriteCancelled());
    });
    cancelled.catch(() => undefined);
    const op: Op = { id: this.nextOp++, label: write.label, state: write.hold ? 'held' : 'queued', apply: write.apply, cancel };
    queue.ops.push(op);
    this.publish(queue);

    const setState = (state: PendingState) => {
      const index = queue.ops.indexOf(op);
      if (index === -1) return;
      queue.ops[index] = Object.assign(op, { state });
      this.notify(queue);
    };
    const remove = () => {
      queue.ops = queue.ops.filter((o) => o !== op);
    };

    const run = async () => {
      if (write.hold) {
        await Promise.race([write.hold, cancelled]);
        setState('queued');
      }
      // Wait for every write made before this one, however it ended.
      const before = queue.tail;
      const done = run2(before);
      queue.tail = done.catch(() => undefined);
      return done;
    };
    const run2 = async (before: Promise<unknown>) => {
      await Promise.race([before, cancelled]);
      setState('sending');
      const version = this.latestConfirmed(queue)?.version ?? write.fallbackVersion ?? 0;
      return write.send(version);
    };

    return run().then(
      (answer) => {
        remove();
        if (!queue.confirmed || answer.version >= queue.confirmed.version) queue.confirmed = answer;
        this.publish(queue);
        return answer;
      },
      (error: unknown) => {
        // Drop only this op; the rest replay on the confirmed record (the rebase).
        remove();
        this.publish(queue);
        throw error;
      },
    );
  }

  /** Drop everything not yet sent (sign-out). A request already on the wire can't be recalled. */
  cancelUnsent() {
    for (const queue of this.queues.values()) for (const op of queue.ops) if (op.state !== 'sending') op.cancel();
  }

  /**
   * A detail refetch that lands while ops are pending would show the server's record without them.
   * Treat it as a newer confirmed record instead, and put the preview back on top.
   */
  private watchFetches() {
    if (this.watching) return;
    this.watching = true;
    this.client.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
      const [tenant, scope, resource, params] = event.query.queryKey as [string, string, string, { id?: string } | undefined];
      if (resource === 'records') {
        // A list page landed: put the preview back on any record in it with writes pending.
        for (const queue of this.queues.values()) if (queue.ops.length > 0 && queue.partition[0] === tenant && queue.partition[1] === scope) this.publish(queue);
        return;
      }
      if (resource !== 'record' || !params?.id) return;
      const queue = this.queues.get(`${tenant}|${scope}|${params.id}`);
      if (!queue || queue.ops.length === 0) return;
      const fetched = event.action.data as RecordEntity;
      if (!queue.confirmed || fetched.version >= queue.confirmed.version) queue.confirmed = fetched;
      this.publish(queue);
    });
  }
}

/** The query-cache trap (see patchListedRecord in mutations.ts): the copy in every cached list page. */
const patchListed = (client: QueryClient, partition: Partition, id: string, patch: (listed: RecordEntity) => RecordEntity | undefined) =>
  client.setQueriesData<RecordPage>({ queryKey: recordKeys.lists(partition) }, (page) => {
    const index = page?.items.findIndex((r) => r.id === id) ?? -1;
    const listed = page?.items[index];
    if (!page || !listed) return undefined;
    const next = patch(listed);
    return next ? { ...page, items: page.items.map((r, i) => (i === index ? next : r)) } : undefined;
  });

/** A copy of the record from any cached list page, if one holds it. */
const listedCopy = (client: QueryClient, partition: Partition, id: string) => {
  for (const [, page] of client.getQueriesData<RecordPage>({ queryKey: recordKeys.lists(partition) })) {
    const found = page?.items.find((r) => r.id === id);
    if (found) return found;
  }
  return undefined;
};

const all = new WeakMap<QueryClient, WriteQueues>();

/** The write queues that belong to this cache. */
export const writeQueues = (client: QueryClient): WriteQueues => {
  let queues = all.get(client);
  if (!queues) {
    queues = new WriteQueues(client);
    all.set(client, queues);
  }
  return queues;
};

/**
 * A newer confirmed version of a record arrived from outside this client's writes (a live event, a
 * 409's current): it becomes the base, and any pending ops are replayed on top of it.
 */
export const confirmRecord = (client: QueryClient, partition: Partition, record: RecordEntity) => writeQueues(client).confirm(partition, record);

/** What's queued or in flight for one record, oldest first: the page shows it ("Saving 2 changes…"). */
export function usePendingWrites(id: string): readonly PendingOp[] {
  const client = useQueryClient();
  const partition = usePartition();
  const queues = writeQueues(client);
  const read = useCallback(() => queues.pending(partition, id), [queues, partition, id]);
  return useSyncExternalStore(queues.subscribe, read, read);
}
