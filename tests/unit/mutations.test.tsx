// @vitest-environment jsdom
import { render, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { RecordEntity } from '../../src/app/api/schemas';
import { recordKeys } from '../../src/app/model/keys';
import { listRecords } from '../../src/app/api/records';
import { isConflict, useArchiveRecord, useBulkDeleteRecords, useCreateRecord, useMoveRecord, useRenameRecord, useUpdateAccount } from '../../src/app/model/mutations';
import { useAccount, useRecord, useRecordCounts, useRecordList } from '../../src/app/model/queries';
import { AccountRef } from '../../src/app/registries/refs';
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

describe('the query-cache trap: a detail edit reaches every cached list', () => {
  const firstPage = { q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10 } as const;
  const otherTab = { ...firstPage, view: 'open' } as const;

  /** Hold every list GET from now on, so nothing but the mutation's own patch can change a list. */
  const holdLists = () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/t/:tenant/records', async ({ request }) => {
        seen.push(request.url);
        return new Promise<Response>(() => undefined);
      }),
    );
    return seen;
  };

  it('renaming in the detail view patches the list that is on screen AND lists cached earlier, before any refetch', async () => {
    const client = testClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProviders tenant="acme" queryClient={client}>
        {children}
      </AppProviders>
    );
    // A list page is on screen; another tab's page was visited earlier and is cached but unmounted.
    const listed = renderHook(() => useRecordList(firstPage), { wrapper });
    await waitFor(() => expect(listed.result.current.isSuccess).toBe(true));
    const target = listed.result.current.data?.items[0] as RecordEntity;
    const onScreen = new Set(listed.result.current.data?.items.map((r) => r.id));
    const openPage = await client.fetchQuery({ queryKey: recordKeys.list('acme', otherTab), queryFn: () => listRecords('acme', otherTab) });
    const openTarget = openPage.items.find((r) => !onScreen.has(r.id)) as RecordEntity;

    const refetches = holdLists();
    const detail = renderHook(() => ({ record: useRecord(target.id), rename: useRenameRecord(target.id), renameOpen: useRenameRecord(openTarget.id) }), { wrapper });
    await waitFor(() => expect(detail.result.current.record.isSuccess).toBe(true));

    detail.result.current.rename.mutate({ name: 'Renamed in the detail view', version: target.version });
    await waitFor(() => expect(detail.result.current.rename.isSuccess || detail.result.current.rename.isPending).toBe(true));
    // The mounted list shows the new name at once, while its refetch is still held open.
    await waitFor(() => expect(listed.result.current.data?.items[0]?.name).toBe('Renamed in the detail view'));

    detail.result.current.renameOpen.mutate({ name: 'Renamed from elsewhere', version: openTarget.version });
    // The unmounted, cached page of another tab is patched too: it will open showing the edit.
    await waitFor(() =>
      expect(client.getQueryData<{ items: RecordEntity[] }>(recordKeys.list('acme', otherTab))?.items.find((r) => r.id === openTarget.id)?.name).toBe('Renamed from elsewhere'),
    );
    // Only the patch could have done it: every list refetch is still being held.
    expect(refetches.length).toBeGreaterThan(0);
    expect(client.getQueryState(recordKeys.list('acme', firstPage))?.fetchStatus).toBe('fetching');
  });

  it('rolls the listed copies back with the detail when the server refuses', async () => {
    const client = testClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProviders tenant="acme" queryClient={client}>
        {children}
      </AppProviders>
    );
    const listed = renderHook(() => useRecordList(firstPage), { wrapper });
    await waitFor(() => expect(listed.result.current.isSuccess).toBe(true));
    const target = listed.result.current.data?.items[0] as RecordEntity;
    const release = failNextRename();
    const detail = renderHook(() => useRenameRecord(target.id), { wrapper });
    detail.result.current.mutate({ name: 'Doomed', version: target.version });
    await waitFor(() => expect(client.getQueryData<{ items: RecordEntity[] }>(recordKeys.list('acme', firstPage))?.items[0]?.name).toBe('Doomed'));
    release();
    await waitFor(() => expect(detail.result.current.isError).toBe(true));
    expect(client.getQueryData<{ items: RecordEntity[] }>(recordKeys.list('acme', firstPage))?.items[0]?.name).toBe(target.name);
  });

  it('a move lands in every listed copy (the table and the board are the same cache entry)', async () => {
    const client = testClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProviders tenant="acme" queryClient={client}>
        {children}
      </AppProviders>
    );
    const view = renderHook(() => ({ list: useRecordList(firstPage), move: useMoveRecord() }), { wrapper });
    await waitFor(() => expect(view.result.current.list.isSuccess).toBe(true));
    const target = view.result.current.list.data?.items.find((r) => r.status !== 'archived' && r.status !== 'active') as RecordEntity;
    holdLists();
    view.result.current.move.mutate({ record: target, status: 'active' });
    await waitFor(() => expect(view.result.current.list.data?.items.find((r) => r.id === target.id)?.status).toBe('active'));
  });

  it('renaming an account needs no list patch at all: rows hold its id and join through the directory', async () => {
    const client = testClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProviders tenant="acme" queryClient={client}>
        {children}
      </AppProviders>
    );
    const listed = renderHook(() => useRecordList({ ...firstPage, pageSize: 50 }), { wrapper });
    await waitFor(() => expect(listed.result.current.isSuccess).toBe(true));
    const accountId = listed.result.current.data?.items[0]?.accountId as string;
    const sharing = listed.result.current.data?.items.filter((r) => r.accountId === accountId).length ?? 0;
    expect(sharing).toBeGreaterThan(1);

    const view = renderHook(() => ({ account: useAccount(accountId), update: useUpdateAccount(accountId) }), { wrapper });
    await waitFor(() => expect(view.result.current.account.isSuccess).toBe(true));
    const rows = render(
      <AppProviders tenant="acme" queryClient={client}>
        <ul>
          {listed.result.current.data?.items
            .filter((r) => r.accountId === accountId)
            .map((r) => (
              <li key={r.id}>
                <AccountRef id={r.accountId} plain />
              </li>
            ))}
        </ul>
      </AppProviders>,
    );
    await waitFor(() => expect(rows.getAllByText(view.result.current.account.data?.name ?? '?')).toHaveLength(sharing));

    const refetches = holdLists();
    await view.result.current.update.mutateAsync({ changes: { name: 'Renamed Account Ltd' }, version: view.result.current.account.data?.version ?? 0 });
    // Every row that shows the account shows the new name; no record list was written or refetched.
    await waitFor(() => expect(rows.getAllByText('Renamed Account Ltd')).toHaveLength(sharing));
    expect(refetches).toHaveLength(0);
  });
});
