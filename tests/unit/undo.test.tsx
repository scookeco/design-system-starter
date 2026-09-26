// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { patchRecord, postArchive, postRestore } from '../../src/app/api/records';
import type { RecordEntity } from '../../src/app/api/schemas';
import { recordKeys } from '../../src/app/model/keys';
import { useTagRecord, useUntagRecord } from '../../src/app/model/mutations';
import { openUndoWindow, undoSettings } from '../../src/app/model/undo';
import { isCancelled } from '../../src/app/model/writeQueue';
import { db } from '../../src/app/mocks/db';
import { firstListedRecord } from '../../src/app/mocks/live';
import { ListPage } from '../../src/examples/ListPage';
import { renderWithApp, server, setupMockApi, testClient, wrapperFor } from './app-harness';

afterEach(cleanup);
setupMockApi();

const ACME = ['acme', 'admin'] as const;
const onServer = (id: string) => db('acme').records.find((r) => r.id === id) as RecordEntity;
const tagged = () => db('acme').records.find((r) => r.tags.length > 0 && !r.tags.includes('legal-hold')) as RecordEntity;
const writesSeen = () => {
  const seen: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.method !== 'GET') seen.push(request.method);
  });
  return seen;
};

describe('the undo window', () => {
  it('Undo inside it drops the held write; after it, Undo has to compensate', async () => {
    const open = openUndoWindow(Infinity);
    expect(open.cancel()).toBe(true);
    await expect(open.closed).rejects.toSatisfy(isCancelled);

    const short = openUndoWindow(5);
    await short.closed;
    expect(short.cancel()).toBe(false);
  });
});

describe('untag, undoable', () => {
  it('shows at once, sends nothing if undone inside the window', async () => {
    const record = tagged();
    const tag = record.tags[0] as string;
    const client = testClient();
    client.setQueryData(recordKeys.detail(ACME, record.id), record);
    const seen = writesSeen();
    const { result } = renderHook(() => useUntagRecord(record.id), { wrapper: wrapperFor(client) });
    const window = openUndoWindow(Infinity);
    result.current.mutate({ tag, hold: window.closed });
    await waitFor(() => expect(client.getQueryData<RecordEntity>(recordKeys.detail(ACME, record.id))?.tags).not.toContain(tag));
    window.cancel();
    await waitFor(() => expect(client.getQueryData<RecordEntity>(recordKeys.detail(ACME, record.id))?.tags).toContain(tag));
    expect(seen).toEqual([]);
    server.events.removeAllListeners();
  });

  it('after the window, the tag is removed on the server; tagging it again compensates', async () => {
    const record = tagged();
    const tag = record.tags[0] as string;
    const client = testClient();
    client.setQueryData(recordKeys.detail(ACME, record.id), record);
    const { result } = renderHook(() => ({ untag: useUntagRecord(record.id), tag: useTagRecord(record.id) }), { wrapper: wrapperFor(client) });
    await result.current.untag.mutateAsync({ tag });
    expect(onServer(record.id).tags).not.toContain(tag);
    await result.current.tag.mutateAsync({ tag });
    expect(onServer(record.id).tags).toContain(tag);
  });

  it('legal hold isn’t a person’s to lift: refused by the client and by the server', async () => {
    const held = db('acme').records.find((r) => r.tags.includes('legal-hold')) as RecordEntity;
    const { result } = renderHook(() => useUntagRecord(held.id), { wrapper: wrapperFor(testClient()) });
    await expect(result.current.mutateAsync({ tag: 'legal-hold' })).rejects.toMatchObject({ status: 403 });
    await expect(patchRecord('acme', held.id, { tags: held.tags.filter((t) => t !== 'legal-hold') }, held.version)).rejects.toMatchObject({ status: 403 });
  });
});

describe('restore, the compensation for a sent archive', () => {
  it('puts an archived record back to its status; a record that isn’t archived is a 409', async () => {
    const record = firstListedRecord('acme') as RecordEntity;
    const archived = await postArchive('acme', record.id);
    const restored = await postRestore('acme', record.id, 'pending', archived.version);
    expect(restored).toMatchObject({ status: 'pending', version: archived.version + 1 });
    await expect(postRestore('acme', record.id, 'active', restored.version)).rejects.toMatchObject({ status: 409 });
  });
});

describe('a board move, undone', () => {
  it('is sent at once; Undo moves it back', async () => {
    undoSettings.windowMs = Infinity;
    const record = firstListedRecord('acme') as RecordEntity;
    const target = record.status === 'overdue' ? 'pending' : 'overdue';
    renderWithApp(<ListPage initialMove={{ id: record.id, status: target }} />, { url: '/records?display=board' });
    const toast = await screen.findByText(/^Moved to/);
    expect(onServer(record.id).status).toBe(target);
    fireEvent.click(within(toast.closest('li') as HTMLElement).getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(onServer(record.id).status).toBe(record.status));
  });
});
