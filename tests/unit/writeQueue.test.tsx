// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { patchRecord } from '../../src/app/api/records';
import type { RecordEntity } from '../../src/app/api/schemas';
import { recordKeys } from '../../src/app/model/keys';
import { reconcileLiveEvent } from '../../src/app/model/live';
import { useRenameRecord } from '../../src/app/model/mutations';
import { useRecord } from '../../src/app/model/queries';
import { isCancelled, usePendingWrites, writeQueues } from '../../src/app/model/writeQueue';
import { db } from '../../src/app/mocks/db';
import { anotherUser, OTHER_PERSON } from '../../src/app/mocks/live';
import { seedRecords } from '../../src/app/mocks/seed';
import { server, setupMockApi, testClient, wrapperFor } from './app-harness';

setupMockApi();

const ACME = ['acme', 'admin'] as const;
const ID = 'r-1001';
const original = seedRecords('acme').find((r) => r.id === ID) as RecordEntity;
const onServer = () => db('acme').records.find((r) => r.id === ID) as RecordEntity;

/**
 * Every PATCH to the record waits at its own gate (released in order by the test), and the server
 * notes the If-Match it was sent and how many were in flight at once. Then the real handler answers.
 */
const gatedPatches = () => {
  const gates: (() => void)[] = [];
  const seen: { ifMatch: string | null; inFlight: number }[] = [];
  let inFlight = 0;
  server.use(
    http.patch('*/api/t/:tenant/records/:id', async ({ request }) => {
      inFlight += 1;
      seen.push({ ifMatch: request.headers.get('If-Match'), inFlight });
      await new Promise<void>((resolve) => gates.push(resolve));
      inFlight -= 1;
      return undefined;
    }),
  );
  const releaseNext = async () => {
    await waitFor(() => expect(gates.length).toBeGreaterThan(0));
    gates.shift()?.();
  };
  return { seen, releaseNext };
};

/** A cache holding the record, and the queue that belongs to it. */
const setup = () => {
  const client = testClient();
  client.setQueryData(recordKeys.detail(ACME, ID), original);
  const cached = () => client.getQueryData<RecordEntity>(recordKeys.detail(ACME, ID));
  const queue = writeQueues(client);
  const write = (label: string, changes: Parameters<typeof patchRecord>[2]) =>
    queue.enqueue(ACME, ID, {
      label,
      apply: (r) => ({ ...r, ...(changes.name ? { name: changes.name } : {}), ...(changes.amountMinor === undefined ? {} : { amount: { ...r.amount, minor: changes.amountMinor } }) }),
      send: (version) => patchRecord('acme', ID, changes, version),
    });
  return { client, cached, queue, write };
};

describe('per-record write queue', () => {
  it('serialises rapid edits: one request at a time, each on the version the last one produced, none lost', async () => {
    const { seen, releaseNext } = gatedPatches();
    const { client, cached } = setup();
    const { result } = renderHook(() => useRenameRecord(ID), { wrapper: wrapperFor(client) });
    const done = ['One', 'Two', 'Three'].map((name) => result.current.mutateAsync({ name, version: original.version }));
    // The preview shows the latest intent at once.
    await waitFor(() => expect(cached()?.name).toBe('Three'));
    for (let i = 0; i < 3; i += 1) await releaseNext();
    await Promise.all(done);
    expect(seen.map((s) => s.ifMatch)).toEqual([`"${String(original.version)}"`, `"${String(original.version + 1)}"`, `"${String(original.version + 2)}"`]);
    expect(Math.max(...seen.map((s) => s.inFlight))).toBe(1);
    expect(onServer()).toMatchObject({ name: 'Three', version: original.version + 3 });
  });

  it('A fails while B waits: only A is dropped, and B replays on the confirmed record', async () => {
    const { client, cached, write } = setup();
    let failFirst = true;
    server.use(
      http.patch('*/api/t/:tenant/records/:id', () => {
        if (!failFirst) return undefined;
        failFirst = false;
        return new Response(JSON.stringify({ error: { code: 'server_error', message: 'Boom.' } }), { status: 500 });
      }),
    );
    const a = write('A', { name: 'Doomed' });
    const b = write('B', { amountMinor: 42 });
    expect(cached()).toMatchObject({ name: 'Doomed', amount: { minor: 42 } });
    await expect(a).rejects.toMatchObject({ status: 500 });
    // A is gone from the preview at once; B is still applied on top of the confirmed record.
    expect(cached()).toMatchObject({ name: original.name, amount: { minor: 42 } });
    await b;
    expect(cached()).toMatchObject({ name: original.name, amount: { minor: 42 }, version: original.version + 1 });
    expect(client.getQueryData<RecordEntity>(recordKeys.detail(ACME, ID))).toEqual(onServer());
  });

  it('A succeeds, then B fails: A’s answer stands, B is dropped', async () => {
    const { cached, write } = setup();
    let calls = 0;
    server.use(
      http.patch('*/api/t/:tenant/records/:id', () => {
        calls += 1;
        return calls === 2 ? new Response(JSON.stringify({ error: { code: 'server_error', message: 'Boom.' } }), { status: 500 }) : undefined;
      }),
    );
    const a = write('A', { name: 'Kept' });
    const b = write('B', { amountMinor: 42 });
    await a;
    await expect(b).rejects.toMatchObject({ status: 500 });
    expect(cached()).toMatchObject({ name: 'Kept', amount: original.amount, version: original.version + 1 });
  });

  it('B never starts before A settles, whichever way A goes', async () => {
    const { seen, releaseNext } = gatedPatches();
    const { write } = setup();
    const a = write('A', { name: 'First' });
    const b = write('B', { name: 'Second' });
    await waitFor(() => expect(seen).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toHaveLength(1);
    await releaseNext();
    await a;
    await releaseNext();
    await b;
    expect(seen).toHaveLength(2);
  });

  it('a pushed change while a write is pending becomes the base; the pending write replays on it', async () => {
    const { seen, releaseNext } = gatedPatches();
    const { client, cached, write } = setup();
    const a = write('A', { name: 'Mine' });
    await waitFor(() => expect(seen).toHaveLength(1));
    // Someone else changes the amount; the event arrives while A is on the wire.
    anotherUser('acme', { kind: 'edit', id: ID, changes: { amountMinor: 777 }, silent: true });
    act(() => reconcileLiveEvent(client, ACME, { type: 'record.updated', record: onServer(), by: OTHER_PERSON.acme }, 'u-sam'));
    expect(cached()).toMatchObject({ name: 'Mine', amount: { minor: 777 } });
    await releaseNext();
    // A was sent on the old version: a 409, and A is dropped. The preview falls back to their record, never the stale one.
    await expect(a).rejects.toMatchObject({ status: 409 });
    expect(cached()).toMatchObject({ name: original.name, amount: { minor: 777 } });
  });

  it('a refetch that lands while a write is pending keeps the preview on top', async () => {
    const { seen, releaseNext } = gatedPatches();
    const client = testClient();
    const { result } = renderHook(() => ({ record: useRecord(ID), rename: useRenameRecord(ID) }), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.record.isSuccess).toBe(true));
    const renamed = result.current.rename.mutateAsync({ name: 'Pending', version: original.version });
    await waitFor(() => expect(seen).toHaveLength(1));
    await act(() => result.current.record.refetch());
    expect(result.current.record.data?.name).toBe('Pending');
    await releaseNext();
    await renamed;
  });

  it('shows what is pending, and sign-out drops what hasn’t been sent', async () => {
    const { seen, releaseNext } = gatedPatches();
    const { client, queue, write } = setup();
    const { result } = renderHook(() => usePendingWrites(ID), { wrapper: wrapperFor(client) });
    const a = write('Saving A…', { name: 'A' });
    const b = write('Saving B…', { name: 'B' });
    await waitFor(() => expect(result.current.map((op) => [op.label, op.state])).toEqual([['Saving A…', 'sending'], ['Saving B…', 'queued']]));
    queue.cancelUnsent();
    await expect(b).rejects.toSatisfy(isCancelled);
    await releaseNext();
    await a;
    expect(seen).toHaveLength(1);
    await waitFor(() => expect(result.current).toEqual([]));
  });
});

describe('a move decided from a snapshot (asRead)', () => {
  it('an assistant’s stale proposal gets a 409, even after a live update refreshed the cache', async () => {
    const { useApplyProposal } = await import('../../src/app/model/ai');
    const client = testClient();
    client.setQueryData(recordKeys.detail(ACME, ID), original);
    const { result } = renderHook(() => useApplyProposal(), { wrapper: wrapperFor(client) });
    // Someone else edits the record after the proposal was made, and the cache hears about it.
    anotherUser('acme', { kind: 'edit', id: ID, changes: { name: 'Edited elsewhere' }, silent: true });
    act(() => reconcileLiveEvent(client, ACME, { type: 'record.updated', record: onServer(), by: OTHER_PERSON.acme }, 'u-sam'));
    const target = original.status === 'pending' ? 'active' : 'pending';
    const outcome = await act(() =>
      result.current.apply.mutateAsync({ ids: [ID], moves: [{ recordId: ID, name: original.name, before: original.status, after: target, version: original.version, reason: '' }] }),
    );
    expect(outcome.outcomes[ID]).toEqual({ ok: false, reason: 'someone else changed it first' });
    expect(onServer().status).toBe(original.status);
  });
});
