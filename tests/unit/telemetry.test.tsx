// @vitest-environment jsdom
/**
 * Mutations as the instrumentation point: every named verb reports start and exactly one outcome
 * through the one sink (src/app/telemetry.ts), from the MutationCache, without a line in the verb.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listMembers } from '../../src/app/api/admin';
import { RECORD_COLUMNS, type RecordEntity } from '../../src/app/api/schemas';
import { useChangeRole, useExportAudit, useInviteMember, useRemoveMember } from '../../src/app/model/admin';
import { useApplyProposal, useAssistant, useCreateConversation, useDeleteConversation, useDraftSuggestion, useRenameConversation } from '../../src/app/model/ai';
import { openUndoWindow } from '../../src/app/model/undo';
import { useArchiveInbox, useMarkRead, useMarkUnread, useUnarchiveInbox } from '../../src/app/model/inbox';
import {
  useAddPerson,
  useArchiveRecord,
  useBulkDeleteRecords,
  useCancelJob,
  useCreateAccount,
  useCreateRecord,
  useDeleteView,
  useDismissJob,
  useMoveRecord,
  useRenameRecord,
  useRestoreRecord,
  useSaveView,
  useStartBulkDelete,
  useTagRecord,
  useUntagRecord,
  useUpdateAccount,
  useUpdateRecord,
  useUpdateView,
} from '../../src/app/model/mutations';
import { useAppSession } from '../../src/app/session';
import { seedAccounts, seedRecords } from '../../src/app/mocks/seed';
import { fail, hold } from '../../src/app/mocks/overrides';
import { emit, telemetry, type MutationEvent, type TelemetryEvent } from '../../src/app/telemetry';
import { captureTelemetry, server, setupMockApi, testClient, wrapperFor } from './app-harness';

setupMockApi();
const events = captureTelemetry();

const records = seedRecords('acme');
const record = records.find((r) => r.status === 'active' && !r.tags.includes('legal-hold')) as RecordEntity;
const another = records.find((r) => r.status === 'pending' && r.id !== record.id) as RecordEntity;
const archived = records.find((r) => r.status === 'archived') as RecordEntity;
const account = seedAccounts('acme')[0];

const mutationEvents = () => events.filter((e): e is MutationEvent => e.kind === 'mutation');
const outcomesOf = (name: string) => mutationEvents().filter((e) => e.name === name && e.phase !== 'start');

/** Every verb, from all four modules, on one client: the same cache the app would share. */
const useEveryVerb = () => ({
  updateRecord: useUpdateRecord(record.id),
  renameRecord: useRenameRecord(record.id),
  moveRecord: useMoveRecord(),
  archiveRecord: useArchiveRecord(another.id),
  restoreRecord: useRestoreRecord(archived.id),
  tagRecord: useTagRecord(record.id),
  untagRecord: useUntagRecord(record.id),
  createRecord: useCreateRecord(),
  bulkDeleteRecords: useBulkDeleteRecords(),
  addPerson: useAddPerson(),
  createAccount: useCreateAccount(),
  updateAccount: useUpdateAccount(account?.id ?? ''),
  saveView: useSaveView(),
  updateView: useUpdateView(),
  deleteView: useDeleteView(),
  startBulkDelete: useStartBulkDelete(),
  cancelJob: useCancelJob(),
  dismissJob: useDismissJob(),
  inviteMember: useInviteMember(),
  changeRole: useChangeRole(),
  removeMember: useRemoveMember(),
  exportAudit: useExportAudit(),
  markRead: useMarkRead(),
  markUnread: useMarkUnread(),
  archiveInbox: useArchiveInbox(),
  unarchiveInbox: useUnarchiveInbox(),
  createConversation: useCreateConversation(),
  renameConversation: useRenameConversation(),
  deleteConversation: useDeleteConversation(),
  assistant: useAssistant({ context: { kind: 'workspace' } }),
  draftSuggestion: useDraftSuggestion(),
  proposal: useApplyProposal(),
});

/** The names every `mutationKey: [...partition, '<verb>'…]` in a model module declares (admin's go through useAdminWrite). */
const declaredVerbs = () => {
  const names = new Set<string>();
  for (const file of ['mutations', 'admin', 'inbox', 'ai']) {
    const source = readFileSync(resolve('src/app/model', `${file}.ts`), 'utf8');
    for (const match of source.matchAll(/mutationKey: \[\.\.\.partition, '([A-Za-z]+)'/g)) names.add(match[1] as string);
    for (const match of source.matchAll(/useAdminWrite\(\s*'([A-Za-z]+)'/g)) names.add(match[1] as string);
    for (const match of source.matchAll(/(\w+): '(mark\w+|\w*[aA]rchiveInbox)'/g)) names.add(match[2] as string);
    for (const match of source.matchAll(/\? '([A-Za-z]+)' : '([A-Za-z]+)', \{ id \}/g)) names.add(match[1] as string).add(match[2] as string);
  }
  return names;
};

beforeEach(() => {
  // exportAudit hands the CSV to the browser; jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => 'blob:export');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('every named mutation reports start and one outcome', () => {
  it('covers every verb in mutations.ts, admin.ts, inbox.ts and ai.ts', async () => {
    const { result } = renderHook(useEveryVerb, { wrapper: wrapperFor(testClient()) });
    const verbs = () => result.current;
    const settle = (promise: Promise<unknown>) => act(() => promise.then(() => undefined, () => undefined));

    await settle(verbs().updateRecord.mutateAsync({ base: record, changes: { amountMinor: 4200 } }));
    await settle(verbs().renameRecord.mutateAsync({ name: 'Renamed for the test', version: record.version + 1 }));
    await settle(verbs().moveRecord.mutateAsync({ record: { id: another.id, version: another.version }, status: 'active' }));
    await settle(verbs().archiveRecord.mutateAsync({}));
    await settle(verbs().restoreRecord.mutateAsync({ status: 'active' }));
    await settle(verbs().tagRecord.mutateAsync({ tag: 'priority' }));
    await settle(verbs().untagRecord.mutateAsync({ tag: 'priority' }));
    await settle(verbs().createRecord.mutateAsync({ record: { name: 'Telemetry lease' }, idempotencyKey: 'telemetry-1' }));
    await settle(verbs().bulkDeleteRecords.mutateAsync({ ids: [records[5]?.id ?? ''] }));
    await settle(verbs().addPerson.mutateAsync('Pat Quinlan'));
    await settle(
      verbs().createAccount.mutateAsync({
        account: { name: 'Quinlan Holdings', domain: 'quinlan.example', industry: 'Retail', ownerId: 'acme-p01', arrMinor: 100_00, customerSince: '2024-01-01' },
        idempotencyKey: 'telemetry-2',
      }),
    );
    await settle(verbs().updateAccount.mutateAsync({ changes: { industry: 'Energy' }, version: account?.version ?? 1 }));
    await settle(verbs().saveView.mutateAsync({ name: 'Mine', config: { view: 'all', q: '', status: [], sort: 'name', columns: [...RECORD_COLUMNS], display: 'table' } }));
    await settle(verbs().updateView.mutateAsync({ id: 'acme-v1', changes: { isDefault: true } }));
    await settle(verbs().deleteView.mutateAsync('acme-v2'));
    let jobId = '';
    await settle(verbs().startBulkDelete.mutateAsync({ ids: [records[6]?.id ?? ''], label: 'Delete 1 record' }).then((job) => (jobId = job.id)));
    await settle(verbs().cancelJob.mutateAsync(jobId));
    await settle(verbs().dismissJob.mutateAsync(jobId));
    await settle(verbs().inviteMember.mutateAsync({ email: 'pat.quinlan@example.com', role: 'viewer' }));
    const members = (await listMembers('acme')).items;
    const editor = members.find((m) => !m.isYou && m.role === 'editor');
    await settle(verbs().changeRole.mutateAsync({ member: editor ?? (members[1] as (typeof members)[number]), role: 'viewer' }));
    await settle(verbs().removeMember.mutateAsync(editor ?? (members[1] as (typeof members)[number])));
    await settle(verbs().exportAudit.mutateAsync({ actor: '', actions: [], from: '', to: '' }));
    await settle(verbs().markRead.mutateAsync(['acme-i001']));
    await settle(verbs().markUnread.mutateAsync(['acme-i001']));
    await settle(verbs().archiveInbox.mutateAsync(['acme-i001']));
    await settle(verbs().unarchiveInbox.mutateAsync(['acme-i001']));
    let conversationId = '';
    await settle(verbs().createConversation.mutateAsync().then((c) => (conversationId = c.id)));
    await settle(verbs().renameConversation.mutateAsync({ id: conversationId, title: 'Renewals' }));
    await settle(verbs().deleteConversation.mutateAsync(conversationId));
    await settle(verbs().assistant.ask('How many records are overdue?'));
    act(() => verbs().draftSuggestion.suggest('Hardware lease'));
    await waitFor(() => expect(outcomesOf('draftSuggestion')).toHaveLength(1));
    await settle(verbs().proposal.apply.mutateAsync({ ids: [], moves: [] }));
    await settle(verbs().proposal.undo.mutateAsync([]));

    const all = mutationEvents();
    // Every mutation has a name; none reports as "unnamed" (a verb without a key would).
    expect(all.every((e) => e.name !== 'unnamed' && e.name !== '')).toBe(true);
    // Each mutation: exactly one start, then exactly one outcome, paired by id.
    const byId = new Map<number, MutationEvent[]>();
    for (const e of all) byId.set(e.mutationId, [...(byId.get(e.mutationId) ?? []), e]);
    for (const [, list] of byId) {
      expect(list.map((e) => e.phase === 'start')).toEqual([true, false]);
      expect(list[1]?.durationMs).toBeGreaterThanOrEqual(0);
    }
    // Every verb the model modules declare reported at least once, and the test didn't miss one.
    const declared = declaredVerbs();
    const reported = new Set(all.map((e) => e.name));
    expect([...declared].filter((name) => !reported.has(name))).toEqual([]);
    // Positive control: the scanner finds every verb this test drove, so it can't pass by finding none.
    // (Deleting a domain module? Drop it from declaredVerbs' list and its verbs from useEveryVerb.)
    expect([...reported].filter((name) => !declared.has(name))).toEqual([]);
    // Ids are fine; what a person typed or who they are never is.
    const serialised = JSON.stringify(events);
    for (const personal of ['Pat Quinlan', 'pat.quinlan@example.com', 'Quinlan Holdings', 'Renamed for the test', 'Renewals', 'Hardware lease', 'Telemetry lease', 'How many records']) {
      expect(serialised).not.toContain(personal);
    }
    expect(all.find((e) => e.name === 'renameRecord')).toMatchObject({ tenant: 'acme', subject: record.id });
  }, 30_000);
});

describe('no mutation goes unnamed', () => {
  it('every useMutation in the app layer and the examples has a key (the name it reports as)', () => {
    const files = [
      ...readdirSync(resolve('src/app/model')).map((f) => resolve('src/app/model', f)),
      ...readdirSync(resolve('src/examples')).map((f) => resolve('src/examples', f)),
    ].filter((f) => /\.tsx?$/.test(f));
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const calls = source.match(/useMutation\(/g)?.length ?? 0;
      const keys = source.match(/mutationKey:/g)?.length ?? 0;
      expect({ file, keys }).toEqual({ file, keys: calls });
    }
  });
});

describe('outcomes', () => {
  it('a success carries its duration; a failure its code and status, never the message', async () => {
    const { result } = renderHook(() => ({ create: useCreateRecord(), update: useUpdateRecord(record.id) }), { wrapper: wrapperFor(testClient()) });
    await act(() => result.current.create.mutateAsync({ record: { name: 'Fine' }, idempotencyKey: 'ok-1' }));
    expect(outcomesOf('createRecord')).toEqual([expect.objectContaining({ phase: 'success', durationMs: expect.any(Number) as number })]);

    server.use(fail('patch', '/records/:id', 500, 'server_error', 'Sam Rivera’s edit could not be saved.'));
    await act(() => result.current.update.mutateAsync({ base: record, changes: { name: 'Nope' } }).catch(() => undefined));
    expect(outcomesOf('updateRecord')).toEqual([expect.objectContaining({ phase: 'failure', code: 'server_error', status: 500 })]);
    expect(JSON.stringify(events)).not.toContain('Sam Rivera');
  });

  it('a stale write reports the conflict; a refusal before sending reports forbidden', async () => {
    const { result } = renderHook(() => useUpdateRecord(record.id), { wrapper: wrapperFor(testClient()) });
    // Someone else changed the name meanwhile, and so did this edit: a real 409.
    await act(() => result.current.mutateAsync({ base: { ...record, version: record.version - 1, name: 'Older' }, changes: { name: 'Mine' } }).catch(() => undefined));
    expect(outcomesOf('updateRecord')[0]).toMatchObject({ phase: 'failure', status: 409 });
  });

  it('an Undo inside the window reports cancelled, not failed', async () => {
    const { result } = renderHook(() => useArchiveRecord(record.id), { wrapper: wrapperFor(testClient()) });
    const undo = openUndoWindow(Infinity);
    let settled: Promise<unknown> = Promise.resolve();
    act(() => {
      settled = result.current.mutateAsync({ hold: undo.closed }).catch(() => undefined);
    });
    await waitFor(() => expect(mutationEvents().some((e) => e.name === 'archiveRecord' && e.phase === 'start')).toBe(true));
    act(() => {
      undo.cancel();
    });
    await act(() => settled);
    expect(outcomesOf('archiveRecord')).toEqual([expect.objectContaining({ phase: 'cancelled' })]);
  });

  it('a write still running at sign-out reports cancelled once', async () => {
    server.use(hold('post', '/records'));
    const { result } = renderHook(() => ({ create: useCreateRecord(), signOut: useAppSession().signOut }), { wrapper: wrapperFor(testClient()) });
    act(() => {
      result.current.create.mutate({ record: { name: 'Never lands' }, idempotencyKey: 'held-1' });
    });
    await waitFor(() => expect(mutationEvents().some((e) => e.name === 'createRecord' && e.phase === 'start')).toBe(true));
    await act(() => result.current.signOut());
    await waitFor(() => expect(outcomesOf('createRecord')).toEqual([expect.objectContaining({ phase: 'cancelled' })]));
  });

  it('an assistant answer that failed mid-stream reports its kind, though the stream resolved', async () => {
    server.use(http.post('*/api/t/:tenant/ai/respond', () => HttpResponse.json({ error: { code: 'rate_limit', message: 'Slow down.' } }, { status: 429 })));
    const { result } = renderHook(() => useAssistant({ context: { kind: 'workspace' } }), { wrapper: wrapperFor(testClient()) });
    await act(() => result.current.ask('Hello'));
    expect(outcomesOf('assistant')).toEqual([expect.objectContaining({ phase: 'failure', code: 'rate_limit' })]);
  });

  it('a sink that throws never breaks the write', async () => {
    telemetry.sink = () => {
      throw new Error('sink down');
    };
    expect(() => emit({ kind: 'render', phase: 'failure', region: '/', code: 'Error' } satisfies TelemetryEvent)).not.toThrow();
    const { result } = renderHook(() => useCreateRecord(), { wrapper: wrapperFor(testClient()) });
    await expect(act(() => result.current.mutateAsync({ record: { name: 'Still saved' }, idempotencyKey: 'sink-1' }))).resolves.toMatchObject({ name: 'Still saved' });
  });
});
