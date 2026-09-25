// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { RecordEntity } from '../../src/app/api/schemas';
import { recordKeys } from '../../src/app/model/keys';
import { isConflict, useArchiveRecord, useBulkDeleteRecords, useCreateRecord, useRenameRecord } from '../../src/app/model/mutations';
import { useRecord, useRecordCounts, useRecordList } from '../../src/app/model/queries';
import { db } from '../../src/app/mocks/db';
import { seedRecords } from '../../src/app/mocks/seed';
import { AppProviders } from '../../src/app/providers';
import { server, setupMockApi, testClient } from './app-harness';

setupMockApi();

const ID = 'r-1001';
const original = seedRecords('acme').find((r) => r.id === ID) as RecordEntity;

/** Mount a hook with a record already in the cache, and hand back the cache to assert on. */
const setup = async <T,>(hook: () => T) => {
  const client = testClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders tenant="acme" queryClient={client}>
      {children}
    </AppProviders>
  );
  const view = renderHook(() => ({ record: useRecord(ID), hook: hook() }), { wrapper });
  await waitFor(() => expect(view.result.current.record.isSuccess).toBe(true));
  const cached = () => client.getQueryData<RecordEntity>(recordKeys.detail('acme', ID));
  return { ...view, client, cached };
};

/** The next rename waits until released, then fails with a 500. */
const failNextRename = () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.patch('*/api/t/:tenant/records/:id', async () => {
      await gate;
      return HttpResponse.json({ error: { code: 'server_error', message: 'Boom.' } }, { status: 500 });
    }),
  );
  return () => release();
};

describe('renameRecord (optimistic)', () => {
  it('patches the cache at once, then reconciles with the server’s answer', async () => {
    const { result, cached } = await setup(() => useRenameRecord(ID));
    result.current.hook.mutate({ name: 'Renamed', version: original.version });
    await waitFor(() => expect(cached()?.name).toBe('Renamed'));
    expect(result.current.hook.isPending || result.current.hook.isSuccess).toBe(true);
    await waitFor(() => expect(result.current.hook.isSuccess).toBe(true));
    expect(cached()).toMatchObject({ name: 'Renamed', version: original.version + 1 });
  });

  it('rolls back to the previous name when the server fails', async () => {
    const release = failNextRename();
    const { result, cached } = await setup(() => useRenameRecord(ID));
    result.current.hook.mutate({ name: 'Doomed', version: original.version });
    await waitFor(() => expect(cached()?.name).toBe('Doomed'));
    release();
    await waitFor(() => expect(result.current.hook.isError).toBe(true));
    expect(cached()?.name).toBe(original.name);
  });

  it('does not roll back over a newer write', async () => {
    const release = failNextRename();
    const { result, cached, client } = await setup(() => useRenameRecord(ID));
    result.current.hook.mutate({ name: 'Doomed', version: original.version });
    await waitFor(() => expect(cached()?.name).toBe('Doomed'));
    // Someone else's write lands on the server, and reaches this cache (a push) while the rename is in flight.
    const newer = { ...original, name: 'From elsewhere', version: original.version + 5 };
    const partition = db('acme');
    partition.records = partition.records.map((r) => (r.id === ID ? newer : r));
    client.setQueryData(recordKeys.detail('acme', ID), newer);
    release();
    await waitFor(() => expect(result.current.hook.isError).toBe(true));
    // Never the stale snapshot: the newer name stays, and the refetch confirms it.
    expect(cached()?.name).toBe('From elsewhere');
    await waitFor(() => expect(result.current.record.isFetching).toBe(false));
    expect(cached()?.name).toBe('From elsewhere');
  });

  it('reports a stale write as a conflict, leaving the detail for the person to reload', async () => {
    const { result, cached } = await setup(() => useRenameRecord(ID));
    result.current.hook.mutate({ name: 'Stale', version: original.version - 1 });
    await waitFor(() => expect(result.current.hook.isError).toBe(true));
    expect(isConflict(result.current.hook.error)).toBe(true);
    expect(cached()?.name).toBe(original.name);
  });
});

describe('pessimistic mutations', () => {
  it('archiveRecord changes nothing until the server answers, then patches the detail and refetches lists and counts', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post('*/api/t/:tenant/records/:id/archive', async () => {
        await gate;
        return HttpResponse.json({ ...original, status: 'archived', version: original.version + 1 });
      }),
    );
    const { result, cached, client } = await setup(() => ({
      archive: useArchiveRecord(ID),
      list: useRecordList({ q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10 }),
      counts: useRecordCounts({ q: '', status: [] }),
    }));
    await waitFor(() => expect(result.current.hook.counts.isSuccess).toBe(true));
    const countsBefore = client.getQueryState(recordKeys.count('acme', { q: '', status: [] }))?.dataUpdateCount ?? 0;
    result.current.hook.archive.mutate();
    await waitFor(() => expect(result.current.hook.archive.isPending).toBe(true));
    expect(cached()?.status).toBe(original.status);
    release();
    await waitFor(() => expect(result.current.hook.archive.isSuccess).toBe(true));
    expect(cached()?.status).toBe('archived');
    expect(client.getQueryState(recordKeys.count('acme', { q: '', status: [] }))?.dataUpdateCount).toBeGreaterThan(countsBefore);
  });

  it('createRecord sends an idempotency key; the same key never makes two records', async () => {
    const { result } = await setup(() => useCreateRecord());
    const input = { record: { name: 'Pilot hosting order' }, idempotencyKey: 'same-key' };
    const first = await result.current.hook.mutateAsync(input);
    const again = await result.current.hook.mutateAsync(input);
    expect(again.id).toBe(first.id);
  });

  it('bulkDeleteRecords removes deleted records from the cache and reports the rest', async () => {
    const onHold = seedRecords('acme').find((r) => r.tags.includes('legal-hold')) as RecordEntity;
    const { result, cached } = await setup(() => useBulkDeleteRecords());
    const outcome = await result.current.hook.mutateAsync({ ids: [ID, onHold.id] });
    expect(outcome.deleted).toEqual([ID]);
    expect(outcome.failed).toEqual([{ id: onHold.id, name: onHold.name, reason: 'on legal hold' }]);
    expect(cached()).toBeUndefined();
  });
});
