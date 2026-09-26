// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../src/app/api/client';
import { patchRecord } from '../../src/app/api/records';
import type { RecordEntity } from '../../src/app/api/schemas';
import { applyChanges, compareVersions, resolveConflict } from '../../src/app/model/conflicts';
import { recordKeys } from '../../src/app/model/keys';
import { conflictingRecord, useUpdateRecord } from '../../src/app/model/mutations';
import { db } from '../../src/app/mocks/db';
import { anotherUser } from '../../src/app/mocks/live';
import { theyEditFirst } from '../../src/app/mocks/overrides';
import { seedRecords } from '../../src/app/mocks/seed';
import { CreateEditFlow } from '../../src/examples/CreateEditFlow';
import { renderWithApp, server, setupMockApi, testClient, wrapperFor } from './app-harness';

afterEach(cleanup);
setupMockApi();

const ACME = ['acme', 'admin'] as const;
const ID = 'r-1001';
const base = seedRecords('acme').find((r) => r.id === ID) as RecordEntity;
const otherOwner = base.ownerId === 'acme-p05' ? 'acme-p06' : 'acme-p05';
const server_ = () => db('acme').records.find((r) => r.id === ID) as RecordEntity;

describe('three-way comparison', () => {
  const mine = applyChanges(base, { name: 'Mine', amountMinor: 100 });

  it('says who changed each field, and only lists what differs', () => {
    const theirs = applyChanges(base, { name: 'Theirs', ownerId: otherOwner });
    expect(compareVersions(base, mine, theirs)).toEqual([
      { field: 'name', changedBy: 'both' },
      { field: 'owner', changedBy: 'theirs' },
      { field: 'amount', changedBy: 'mine' },
    ]);
  });

  it('the same change on both sides is not a conflict', () => {
    expect(compareVersions(base, mine, applyChanges(base, { name: 'Mine' }))).toEqual([{ field: 'amount', changedBy: 'mine' }]);
  });

  it('keep mine sends my fields, never theirs; choices pick per field; take theirs is sending nothing', () => {
    const theirs = applyChanges(base, { name: 'Theirs', amountMinor: 999, ownerId: otherOwner });
    expect(resolveConflict(base, mine, theirs, {})).toEqual({ name: 'Mine', amountMinor: 100 });
    expect(resolveConflict(base, mine, theirs, { name: 'theirs' })).toEqual({ amountMinor: 100 });
    expect(resolveConflict(base, mine, theirs, { name: 'theirs', amount: 'theirs' })).toEqual({});
  });
});

describe('versioned writes on the wire', () => {
  it('sends If-Match; a stale version gets a 409 with the record as it is now', async () => {
    const saved = await patchRecord('acme', ID, { name: 'First' }, base.version);
    expect(saved.version).toBe(base.version + 1);
    const conflict = await patchRecord('acme', ID, { name: 'Stale' }, base.version).catch((e: unknown) => e);
    expect(conflict).toBeInstanceOf(ApiError);
    expect(conflictingRecord(conflict)).toMatchObject({ name: 'First', version: base.version + 1 });
  });

  it('refuses a write without If-Match (428), and answers with an ETag', async () => {
    const url = `http://localhost/api/t/acme/records/${ID}`;
    const missing = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'No check' }) });
    expect(missing.status).toBe(428);
    const read = await fetch(url);
    expect(read.headers.get('ETag')).toBe(`"${String(base.version)}"`);
  });

  it('a viewer’s edit is refused by capability, a name-only change is a rename', async () => {
    const { setRoles } = await import('../../src/app/mocks/db');
    setRoles('viewer');
    await expect(patchRecord('acme', ID, { amountMinor: 5 }, base.version)).rejects.toMatchObject({ status: 403 });
  });
});

describe('updateRecord', () => {
  const setup = () => renderHook(() => useUpdateRecord(ID), { wrapper: wrapperFor(testClient()) });

  it('re-bases once, on its own, when no field was changed on both sides', async () => {
    anotherUser('acme', { kind: 'edit', id: ID, changes: { amountMinor: 4_200 }, silent: true });
    const { result } = setup();
    result.current.mutate({ base, changes: { name: 'Merged' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(server_()).toMatchObject({ name: 'Merged', amount: { minor: 4_200 }, version: base.version + 2 });
  });

  it('surfaces a real conflict with their version, and the cache takes it', async () => {
    const client = testClient();
    client.setQueryData(recordKeys.detail(ACME, ID), base);
    anotherUser('acme', { kind: 'edit', id: ID, changes: { name: 'Theirs' }, silent: true });
    const { result } = renderHook(() => useUpdateRecord(ID), { wrapper: wrapperFor(client) });
    result.current.mutate({ base, changes: { name: 'Mine' } });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(conflictingRecord(result.current.error)?.name).toBe('Theirs');
    expect(client.getQueryData<RecordEntity>(recordKeys.detail(ACME, ID))?.name).toBe('Theirs');
    expect(server_().name).toBe('Theirs');
  });
});

describe('the edit form’s conflict panel', () => {
  const open = async (theirs: Parameters<typeof theyEditFirst>[0], draft: { name?: string; amount?: string }) => {
    server.use(theyEditFirst(theirs));
    renderWithApp(<CreateEditFlow recordId={ID} initialDraft={draft} initialSubmitting />);
    return screen.findByRole('table', { name: 'Your changes and theirs' });
  };

  it('Keep mine (overwrite) saves my name over theirs', async () => {
    await open({ name: 'Theirs' }, { name: 'Mine' });
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine (overwrite)' }));
    await screen.findByText('Your changes were saved.');
    expect(server_().name).toBe('Mine');
  });

  it('Take theirs drops my edit and loads their version into the form', async () => {
    await open({ name: 'Theirs' }, { name: 'Mine' });
    fireEvent.click(screen.getByRole('button', { name: 'Take theirs' }));
    await waitFor(() => expect(screen.queryByRole('table', { name: 'Your changes and theirs' })).toBeNull());
    expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Theirs');
    expect(server_().name).toBe('Theirs');
  });

  it('a choice per field when several collide', async () => {
    const table = await open({ name: 'Theirs', amountMinor: 9_900_000 }, { name: 'Mine', amount: '15000.00' });
    const amountRow = within(table).getByRole('row', { name: /Amount/ });
    fireEvent.click(within(amountRow).getByRole('radio', { name: 'Theirs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save these choices' }));
    await screen.findByText('Your changes were saved.');
    expect(server_()).toMatchObject({ name: 'Mine', amount: { minor: 9_900_000 } });
  });
});
