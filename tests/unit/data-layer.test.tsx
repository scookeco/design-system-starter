// @vitest-environment jsdom
/**
 * Data-layer races, from the surfaces' side (hooks mounted as pages mount them, one shared cache):
 * overlapping writes to one record, and a write whose outcome is unknown.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { RecordEntity } from '../../src/app/api/schemas';
import { recordKeys } from '../../src/app/model/keys';
import { reconcileLiveEvent } from '../../src/app/model/live';
import { isUnknownOutcome, useCreateRecord, useMoveRecord, useRenameRecord } from '../../src/app/model/mutations';
import { useRecord, useRecordList } from '../../src/app/model/queries';
import { db } from '../../src/app/mocks/db';
import { anotherUser, OTHER_PERSON } from '../../src/app/mocks/live';
import { dropAfterApply } from '../../src/app/mocks/overrides';
import { seedRecords } from '../../src/app/mocks/seed';
import { server, setupMockApi, testClient, wrapperFor } from './app-harness';

setupMockApi();

const ACME = ['acme', 'admin'] as const;
const original = seedRecords('acme').find((r) => r.status === 'active' && !r.tags.includes('legal-hold')) as RecordEntity;
const onServer = () => db('acme').records.find((r) => r.id === original.id) as RecordEntity;
/** A list page that holds the record: the table on screen. */
const LIST = { view: 'all', q: original.name, status: [], sort: 'name', page: 1, pageSize: 50 } as const;

describe('overlapping writes to one record, from two surfaces', () => {
  it('keep their order, and a late failure never clobbers a newer success (theirs, pushed; then ours, queued)', async () => {
    const order: string[] = [];
    let failRename: () => void = () => undefined;
    server.use(
      // The rename is on the wire until the test fails it, late.
      http.patch('*/api/t/:tenant/records/:id', async () => {
        order.push('rename');
        await new Promise<void>((resolve) => {
          failRename = resolve;
        });
        return HttpResponse.json({ error: { code: 'server_error', message: 'Boom.' } }, { status: 500 });
      }),
      http.post('*/api/t/:tenant/records/:id/status', ({ request }) => {
        order.push(`move If-Match ${request.headers.get('If-Match') ?? ''}`);
        return undefined;
      }),
    );
    const client = testClient();
    // The record page (detail + rename) and the board (a listed copy + move) on one cache.
    const { result } = renderHook(() => ({ detail: useRecord(original.id), list: useRecordList(LIST), rename: useRenameRecord(original.id), move: useMoveRecord() }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.detail.isSuccess && result.current.list.isSuccess).toBe(true));
    const detail = () => client.getQueryData<RecordEntity>(recordKeys.detail(ACME, original.id));
    const listed = () => result.current.list.data?.items.find((r) => r.id === original.id);

    // 1. The record page renames (optimistic): on the wire, held.
    let renamed: Promise<unknown> = Promise.resolve();
    act(() => {
      renamed = result.current.rename.mutateAsync({ name: 'Will fail', version: original.version }).catch((error: unknown) => error);
    });
    await waitFor(() => expect(order).toEqual(['rename']));
    expect(listed()?.name).toBe('Will fail');

    // 2. Meanwhile someone else's change lands and is pushed: a newer confirmed record.
    anotherUser('acme', { kind: 'edit', id: original.id, changes: { amountMinor: 424_242 }, silent: true });
    act(() => reconcileLiveEvent(client, ACME, { type: 'record.updated', record: onServer(), by: OTHER_PERSON.acme }, 'u-sam'));
    // 3. …and the board moves the same record: queued behind the rename, never beside it.
    let moved: Promise<RecordEntity> = Promise.resolve(original);
    act(() => {
      moved = result.current.move.mutateAsync({ record: { id: original.id, version: original.version }, status: 'pending' });
    });
    expect(order).toEqual(['rename']);

    // 4. The rename fails, late. Only it is dropped: their amount stays, and the move goes next, on their version.
    failRename();
    await expect(renamed).resolves.toMatchObject({ status: 500 });
    await act(() => moved);
    expect(order).toEqual(['rename', `move If-Match "${String(original.version + 1)}"`]);
    const final = onServer();
    expect(final).toMatchObject({ name: original.name, amount: { minor: 424_242 }, status: 'pending', version: original.version + 2 });
    // Every surface agrees with the server: never the snapshot from before the rename.
    await waitFor(() => expect(detail()).toMatchObject({ name: original.name, amount: { minor: 424_242 }, status: 'pending', version: final.version }));
    await waitFor(() => expect(listed()).toMatchObject({ name: original.name, amount: { minor: 424_242 }, status: 'pending', version: final.version }));
  });
});

describe('an unknown outcome: the connection drops after the server applied the write', () => {
  it('reconciles by refetching, and a retry with the same key makes no duplicate', async () => {
    const name = 'Unknown outcome lease';
    server.use(dropAfterApply('post', '/records'));
    const client = testClient();
    const query = { view: 'all', q: name, status: [], sort: 'name', page: 1, pageSize: 10 } as const;
    const { result } = renderHook(() => ({ list: useRecordList(query), create: useCreateRecord() }), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.list.data?.total).toBe(0));

    // The server made it, but the answer never arrived: to the client, a network error.
    const key = 'create-unknown-1';
    const error = await act(() => result.current.create.mutateAsync({ record: { name }, idempotencyKey: key }).catch((e: unknown) => e));
    expect(isUnknownOutcome(error)).toBe(true);
    expect(db('acme').records.filter((r) => r.name === name)).toHaveLength(1);
    // Reconciled: the list read again after the failure, so it shows what the server has.
    await waitFor(() => expect(result.current.list.data?.items.map((r) => r.name)).toEqual([name]));

    // The person retries (the form kept the key): the server returns the record it already made.
    const retried = await act(() => result.current.create.mutateAsync({ record: { name }, idempotencyKey: key }));
    expect(retried.id).toBe(result.current.list.data?.items[0]?.id);
    expect(db('acme').records.filter((r) => r.name === name)).toHaveLength(1);
    await waitFor(() => expect(result.current.list.data?.total).toBe(1));
  });
});
