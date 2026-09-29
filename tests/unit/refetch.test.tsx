// @vitest-environment jsdom
/**
 * A write while a list is still on its FIRST load. The list's GET reaches the server before the
 * write, so its answer lacks the write; if it arrives after, invalidateQueries alone joins it (TanStack
 * Query only restarts an in-flight fetch that already has data) and the write never shows. Every
 * verb family refetches through refetchAfterWrite (src/app/model/refetch.ts): these hold the first
 * read past the write, deterministically, and assert the write is on the list.
 */
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { getResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { seedAccounts, seedPeople, seedRecords } from '../../src/app/mocks/seed';
import { handlers } from '../../src/app/mocks/handlers';
import { listInbox } from '../../src/app/api/inbox';
import { dropAfterApply } from '../../src/app/mocks/overrides';
import { useInviteMember, useMembers } from '../../src/app/model/admin';
import { useArchiveInbox, useInbox } from '../../src/app/model/inbox';
import { useAddPerson, useCreateAccount, useCreateRecord, useRenameRecord, useSaveView, useStartBulkDelete, useUpdateAccount } from '../../src/app/model/mutations';
import { useStartImport } from '../../src/app/model/imports';
import { useAccounts, useJobs, usePeople, useRecordList, useSavedViews } from '../../src/app/model/queries';
import { server, setupMockApi, testClient, wrapperFor } from './app-harness';

afterEach(cleanup);
setupMockApi();

/**
 * Hold the first GET of `path` (in acme): it's answered from the server as it is now, before the
 * write, and delivered only once the write has been answered. Returns when that GET has arrived.
 */
const holdFirstRead = (path: string) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  server.use(
    http.get(
      `*/api/t/acme${path}`,
      async ({ request }) => {
        const early = await getResponse(handlers, request);
        held = true;
        await gate;
        return early;
      },
      { once: true },
    ),
  );
  return {
    arrived: () => waitFor(() => expect(held).toBe(true)),
    release: () => release(),
  };
};

/** Hold a write before the server sees it, so a read can reach the server first. */
const holdWrite = (method: 'patch' | 'post', path: string) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  server.use(
    http[method](
      `*/api/t/acme${path}`,
      async ({ request }) => {
        held = true;
        await gate;
        return getResponse(handlers, request);
      },
      { once: true },
    ),
  );
  return { arrived: () => waitFor(() => expect(held).toBe(true)), release: () => release() };
};

/**
 * Resolves once the server has answered a `method` request to a path ending in `suffix`. Not the
 * mutation's own promise: before the fix, its onSuccess waits on the held read, which never comes.
 */
const answered = (method: string, suffix: string) =>
  new Promise<void>((resolve) => {
    const listener = ({ request, response }: { request: Request; response: Response }) => {
      if (request.method === method && new URL(request.url).pathname.endsWith(suffix) && response.ok) {
        server.events.removeListener('response:mocked', listener);
        resolve();
      }
    };
    server.events.on('response:mocked', listener);
  });

/** Hold the first read, write, let the stale read land, then wait for `shows`. */
const race = async (read: ReturnType<typeof holdFirstRead>, write: () => void, method: string, suffix: string) => {
  await read.arrived();
  const done = answered(method, suffix);
  write();
  await done;
  read.release();
};

const itemsOf = <T,>(data: T[] | { items: T[] } | undefined): T[] => (Array.isArray(data) ? data : (data?.items ?? []));

/** Above the 5 s each wait allows (setup.ts), so a race that fails reports which wait gave up. */
const RACE_TIMEOUT = 15_000;

describe('a write while the list is still on its first load shows on the list', { timeout: RACE_TIMEOUT }, () => {
  it('records: createRecord', async () => {
    const read = holdFirstRead('/records');
    const { result } = renderHook(
      () => ({ list: useRecordList({ q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10 }), create: useCreateRecord() }),
      { wrapper: wrapperFor(testClient()) },
    );
    // Sorts first by name, so it's on page 1.
    await race(read, () => result.current.create.mutate({ record: { name: 'Aaron race order' }, idempotencyKey: 'race-1' }), 'POST', '/records');
    const before = seedRecords('acme').filter((r) => r.status !== 'archived').length;
    await waitFor(() => expect(result.current.list.data?.total).toBe(before + 1));
    expect(result.current.list.data?.items.map((r) => r.name)).toContain('Aaron race order');
  });

  it('records: createRecord whose answer never arrived (an unknown outcome) still reads again', async () => {
    const read = holdFirstRead('/records');
    server.use(dropAfterApply('post', '/records'));
    const { result } = renderHook(
      () => ({ list: useRecordList({ q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10 }), create: useCreateRecord() }),
      { wrapper: wrapperFor(testClient()) },
    );
    await read.arrived();
    result.current.create.mutate({ record: { name: 'Aaron dropped answer' }, idempotencyKey: 'race-drop' });
    // The server made it; the client only saw the connection drop. Its reconcile read goes after the held one.
    await waitFor(() => expect(result.current.create.isError).toBe(true));
    read.release();
    await waitFor(() => expect(result.current.list.data?.items.map((r) => r.name)).toContain('Aaron dropped answer'));
  });

  it('views: saveView', async () => {
    const read = holdFirstRead('/views');
    const { result } = renderHook(() => ({ views: useSavedViews(), save: useSaveView() }), { wrapper: wrapperFor(testClient()) });
    const config = { view: 'open', q: '', status: [], sort: 'name', columns: ['owner'], display: 'table' } as const;
    await race(read, () => result.current.save.mutate({ name: 'Raced view', config: { ...config, status: [], columns: [...config.columns] } }), 'POST', '/views');
    await waitFor(() => expect(itemsOf(result.current.views.data).map((v) => v.name)).toContain('Raced view'));
  });

  it('people: addPerson', async () => {
    const read = holdFirstRead('/people');
    const { result } = renderHook(() => ({ people: usePeople(), add: useAddPerson() }), { wrapper: wrapperFor(testClient()) });
    await race(read, () => result.current.add.mutate('Rae Cooper'), 'POST', '/people');
    await waitFor(() => expect(itemsOf(result.current.people.data).map((p) => p.name)).toContain('Rae Cooper'));
  });

  it('accounts: createAccount', async () => {
    const read = holdFirstRead('/accounts');
    const { result } = renderHook(() => ({ accounts: useAccounts(), create: useCreateAccount() }), { wrapper: wrapperFor(testClient()) });
    const account = { name: 'Racecar Ltd', domain: 'racecar.example', industry: 'Software', ownerId: seedPeople('acme')[0]?.id ?? '', arrMinor: 100_000, customerSince: '2026-09-01' };
    await race(read, () => result.current.create.mutate({ account, idempotencyKey: 'race-2' }), 'POST', '/accounts');
    await waitFor(() => expect(itemsOf(result.current.accounts.data).map((a) => a.name)).toContain('Racecar Ltd'));
  });

  it('accounts: updateAccount (the directory every row joins its name from)', async () => {
    const first = seedAccounts('acme')[0];
    const read = holdFirstRead('/accounts');
    const { result } = renderHook(() => ({ accounts: useAccounts(), update: useUpdateAccount(first?.id ?? '') }), { wrapper: wrapperFor(testClient()) });
    await race(read, () => result.current.update.mutate({ changes: { name: 'Northwind Holdings' }, version: first?.version ?? 0 }), 'PATCH', `/accounts/${first?.id ?? ''}`);
    await waitFor(() => expect(itemsOf(result.current.accounts.data).find((a) => a.id === first?.id)?.name).toBe('Northwind Holdings'));
  });

  it('admin: inviteMember', async () => {
    const read = holdFirstRead('/members');
    const { result } = renderHook(() => ({ members: useMembers(), invite: useInviteMember() }), { wrapper: wrapperFor(testClient()) });
    await race(read, () => result.current.invite.mutate({ email: 'rae@acme.example', role: 'viewer' }), 'POST', '/members');
    await waitFor(() => expect(itemsOf(result.current.members.data).map((m) => m.email)).toContain('rae@acme.example'));
  });

  it('jobs: startBulkDelete', async () => {
    const read = holdFirstRead('/jobs');
    const { result } = renderHook(() => ({ jobs: useJobs(), start: useStartBulkDelete() }), { wrapper: wrapperFor(testClient()) });
    const draft = seedRecords('acme').find((r) => r.status === 'draft');
    await race(read, () => result.current.start.mutate({ ids: [draft?.id ?? ''], label: 'Delete 1 raced record' }), 'POST', '/jobs/bulk-delete');
    await waitFor(() => expect(itemsOf(result.current.jobs.data).map((j) => j.label)).toContain('Delete 1 raced record'));
  });

  it('records: renameRecord (optimistic; a list that starts loading while the write is in flight)', async () => {
    const first = seedRecords('acme')
      .filter((r) => r.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id))[0];
    const client = testClient();
    const write = holdWrite('patch', `/records/${first?.id ?? ''}`);
    const renamer = renderHook(() => useRenameRecord(first?.id ?? ''), { wrapper: wrapperFor(client) });
    renamer.result.current.mutate({ name: 'Aaron renamed lease', version: first?.version ?? 0 });
    await write.arrived();
    // The list mounts mid-write, after onMutate's cancel: its read reaches the server first.
    const read = holdFirstRead('/records');
    const listed = renderHook(() => useRecordList({ q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10 }), { wrapper: wrapperFor(client) });
    await read.arrived();
    const done = answered('PATCH', `/records/${first?.id ?? ''}`);
    write.release();
    await done;
    read.release();
    await waitFor(() => expect(listed.result.current.data?.items.find((r) => r.id === first?.id)?.name).toBe('Aaron renamed lease'));
  });

  it('inbox: triage (optimistic; a view that starts loading while the write is in flight)', async () => {
    const [item] = (await listInbox('acme', 'inbox')).items;
    const client = testClient();
    const write = holdWrite('post', '/inbox/triage');
    const archiver = renderHook(() => useArchiveInbox(), { wrapper: wrapperFor(client) });
    archiver.result.current.mutate([item?.id ?? '']);
    await write.arrived();
    const read = holdFirstRead('/inbox');
    const view = renderHook(() => useInbox('inbox'), { wrapper: wrapperFor(client) });
    await read.arrived();
    const done = answered('POST', '/inbox/triage');
    write.release();
    await done;
    read.release();
    await waitFor(() => expect(view.result.current.data?.items.some((i) => i.id === item?.id)).toBe(false));
  });

  // ── Demo examples ──
  it('jobs: startImport', async () => {
    const read = holdFirstRead('/jobs');
    const { result } = renderHook(() => ({ jobs: useJobs(), start: useStartImport() }), { wrapper: wrapperFor(testClient()) });
    const rows = [{ row: 2, cells: { name: 'Raced import' } }];
    await race(read, () => result.current.start.mutate({ rows, file: 'race.csv', idempotencyKey: 'race-import' }), 'POST', '/jobs/import');
    await waitFor(() => expect(itemsOf(result.current.jobs.data).map((j) => j.label)).toContain('Import 1 row from race.csv'));
  });
});
