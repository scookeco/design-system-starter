// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reporting } from '../../src/app/api/client';
import type { RecordEntity, RecordPage } from '../../src/app/api/schemas';
import { recordKeys } from '../../src/app/model/keys';
import { useLiveActivity } from '../../src/app/model/live';
import { useRecord, useRecordList } from '../../src/app/model/queries';
import { currentSession, db, setRoles } from '../../src/app/mocks/db';
import { anotherUser, firstListedRecord, mockLive, OTHER_PERSON, sendRaw, subscriberCount } from '../../src/app/mocks/live';
import { AppProviders } from '../../src/app/providers';
import { useAppSession } from '../../src/app/session';
import { createMemoryHistory } from '../../src/app/url/history';
import { ListPage } from '../../src/examples/ListPage';
import { renderWithApp, setupMockApi, testClient, wrapperFor } from './app-harness';

afterEach(cleanup);
setupMockApi();

const ACME = ['acme', 'admin'] as const;
const QUERY = { q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10 } as const;

/** A record and the first list page, loaded, with the live channel connected. */
const loaded = async (id: string) => {
  const client = testClient();
  const view = renderHook(() => ({ record: useRecord(id), list: useRecordList(QUERY), live: useLiveActivity() }), { wrapper: wrapperFor(client, 'acme', mockLive) });
  await waitFor(() => expect(view.result.current.record.isSuccess && view.result.current.list.isSuccess).toBe(true));
  const listed = () => client.getQueryData<RecordPage>(recordKeys.list(ACME, QUERY))?.items.find((r) => r.id === id);
  const detail = () => client.getQueryData<RecordEntity>(recordKeys.detail(ACME, id));
  return { ...view, client, listed, detail };
};

describe('live updates: one reconcile step', () => {
  it('an edit patches the detail and the listed row in place, and leaves the list on screen unfetched', async () => {
    const first = firstListedRecord('acme') as RecordEntity;
    const { client, listed, detail, result } = await loaded(first.id);
    const listState = () => client.getQueryState(recordKeys.list(ACME, QUERY));

    act(() => void anotherUser('acme', { kind: 'edit', id: first.id, changes: { name: 'Edited elsewhere' } }));

    expect(detail()).toMatchObject({ name: 'Edited elsewhere', version: first.version + 1 });
    expect(listed()).toMatchObject({ name: 'Edited elsewhere' });
    // Stale, so the next focus or mount refetches, but not refetched now: nothing reorders under the cursor.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(listState()).toMatchObject({ isInvalidated: true, fetchStatus: 'idle' });
    expect(result.current.live.lastBy).toBe(OTHER_PERSON.acme);
  });

  it('is idempotent: an event no newer than the cache changes nothing', async () => {
    const first = firstListedRecord('acme') as RecordEntity;
    const { detail } = await loaded(first.id);
    act(() => sendRaw('acme', { type: 'record.updated', record: { ...first, name: 'Old news' }, by: OTHER_PERSON.acme }));
    expect(detail()?.name).toBe(first.name);
  });

  it('a create is counted as new, not inserted; the next list answer clears the count', async () => {
    const first = firstListedRecord('acme') as RecordEntity;
    const { result, client } = await loaded(first.id);
    act(() => {
      anotherUser('acme', { kind: 'add' });
      anotherUser('acme', { kind: 'add' });
    });
    expect(result.current.live.newIds).toHaveLength(2);
    expect(client.getQueryData<RecordPage>(recordKeys.list(ACME, QUERY))?.items.some((r) => r.ownerId === OTHER_PERSON.acme && r.name === 'Regional hosting agreement')).toBe(false);
    await act(() => client.invalidateQueries({ queryKey: recordKeys.lists(ACME) }));
    await waitFor(() => expect(result.current.live.newIds).toHaveLength(0));
  });

  it('the echo of this person’s own create is not “new”', async () => {
    const first = firstListedRecord('acme') as RecordEntity;
    const { result } = await loaded(first.id);
    const self = currentSession().user.id;
    act(() => sendRaw('acme', { type: 'record.created', record: { ...first, id: 'r-9999' }, by: self }));
    expect(result.current.live.newIds).toHaveLength(0);
  });

  it('a delete removes the row from every cached page and flags an open record', async () => {
    const first = firstListedRecord('acme') as RecordEntity;
    const { client, listed, result } = await loaded(first.id);
    const total = client.getQueryData<RecordPage>(recordKeys.list(ACME, QUERY))?.total ?? 0;
    act(() => void anotherUser('acme', { kind: 'delete', id: first.id }));
    expect(listed()).toBeUndefined();
    expect(client.getQueryData<RecordPage>(recordKeys.list(ACME, QUERY))?.total).toBe(total - 1);
    expect(result.current.live.deletedIds).toContain(first.id);
  });

  it('a message that breaks the contract is reported and dropped', async () => {
    const report = vi.spyOn(reporting, 'report').mockImplementation(() => undefined);
    const first = firstListedRecord('acme') as RecordEntity;
    const { detail } = await loaded(first.id);
    act(() => sendRaw('acme', { type: 'record.updated', record: { id: first.id, name: 42 } }));
    expect(report).toHaveBeenCalledOnce();
    expect(detail()).toEqual(first);
    report.mockRestore();
  });
});

describe('live updates follow the grant', () => {
  it('a viewer never hears about a draft; a draft that becomes pending arrives as new', async () => {
    setRoles('viewer');
    const draft = db('acme').records.find((r) => r.status === 'draft') as RecordEntity;
    const client = testClient();
    const { result } = renderHook(() => ({ list: useRecordList(QUERY), live: useLiveActivity() }), { wrapper: wrapperFor(client, 'acme', mockLive) });
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    act(() => void anotherUser('acme', { kind: 'edit', id: draft.id, changes: { name: 'Secret draft' } }));
    expect(result.current.live.lastAt).toBeUndefined();
    act(() => void anotherUser('acme', { kind: 'edit', id: draft.id, changes: { status: 'pending' } }));
    expect(result.current.live.newIds).toEqual([draft.id]);
  });
});

describe('live subscription and the session boundary', () => {
  let app: ReturnType<typeof useAppSession> | undefined;
  function Handle() {
    app = useAppSession();
    return null;
  }

  it('switching workspace moves the subscription; signing out ends it', async () => {
    render(
      <AppProviders session={currentSession()} tenant="acme" queryClient={testClient()} history={createMemoryHistory('/')} live={mockLive} signedOut={<p>Signed out</p>}>
        <Handle />
      </AppProviders>,
    );
    expect(subscriberCount('acme')).toBe(1);
    act(() => app?.switchTenant('globex'));
    expect(subscriberCount('acme')).toBe(0);
    expect(subscriberCount('globex')).toBe(1);
    await act(async () => app?.signOut());
    await screen.findByText('Signed out');
    expect(subscriberCount('globex')).toBe(0);
  });
});

describe('the list page', () => {
  it('offers “Show N new” instead of inserting rows, and shows them on request', async () => {
    renderWithApp(<ListPage />, { url: '/records', live: mockLive });
    await screen.findByRole('navigation', { name: 'Records pages' });
    const table = screen.getByRole('table', { name: 'Records' });
    act(() => {
      anotherUser('acme', { kind: 'add', name: 'Aaa pushed record' });
      anotherUser('acme', { kind: 'add', name: 'Aab pushed record' });
    });
    expect(within(table).queryByRole('link', { name: 'Aaa pushed record' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Show 2 new' }));
    expect(await within(table).findByRole('link', { name: 'Aaa pushed record' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Show \d new/ })).toBeNull());
  });
});
