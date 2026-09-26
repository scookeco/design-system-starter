// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { streamAssistant, type AiEvent, type AiRequest } from '../../src/app/api/ai';
import type { Tenant } from '../../src/app/api/schemas';
import { ApiError, ContractError, reporting } from '../../src/app/api/client';
import { aiMalformed, aiNetworkDropped, aiRateLimited, aiContentFiltered } from '../../src/app/mocks/ai';
import { setRoles } from '../../src/app/mocks/db';
import { seedRecords } from '../../src/app/mocks/seed';
import { useAssistant, useConversations, useCreateConversation, useDeleteConversation, useDraftSuggestion, useRenameConversation } from '../../src/app/model/ai';
import { server, setupMockApi, testClient, wrapperFor } from './app-harness';

afterEach(cleanup);
setupMockApi();

const records = seedRecords('acme');
const draft = records.find((r) => r.status === 'draft');
const visible = records.find((r) => r.status === 'active');

const collect = async (tenant: Tenant, body: AiRequest) => {
  const events: AiEvent[] = [];
  await streamAssistant(tenant, body, (e) => events.push(e));
  return events;
};
const text = (events: AiEvent[]) => events.flatMap((e) => (e.type === 'token' ? [e.text] : [])).join('');

describe('the mock assistant answers as the signed-in person', () => {
  it('streams tokens, tool activity and citations for a record, and says it read the record', async () => {
    const events = await collect('acme', { prompt: 'When does this renew?', context: { kind: 'record', id: visible?.id ?? '' } });
    expect(events[0]).toMatchObject({ type: 'tool', name: 'Read record' });
    expect(events.filter((e) => e.type === 'token').length).toBeGreaterThan(5);
    expect(text(events)).toMatch(/^It renews on \*\*/);
    expect(events.find((e) => e.type === 'citations')).toMatchObject({ sources: [{ title: 'Renews on', origin: 'Record field' }, { origin: expect.stringMatching(/^Activity/) as string }] });
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('never reads what the person can’t see: a viewer asking about a draft gets a 404, as the list would', async () => {
    setRoles('viewer');
    await expect(collect('acme', { prompt: 'Summarise', context: { kind: 'record', id: draft?.id ?? '' } })).rejects.toMatchObject({ status: 404 });
    setRoles('editor');
    await expect(collect('acme', { prompt: 'Summarise', context: { kind: 'record', id: draft?.id ?? '' } })).resolves.toBeTruthy();
  });

  it('stays inside the workspace: another tenant’s record id is not found, and naming another workspace is out of scope', async () => {
    await expect(collect('acme', { prompt: 'Summarise', context: { kind: 'record', id: 'g-1001' } })).rejects.toMatchObject({ status: 404 });
    const events = await collect('acme', { prompt: 'How many records does Globex have?', context: { kind: 'workspace' } });
    expect(events[0]).toMatchObject({ type: 'refusal', reason: 'out_of_scope' });
    expect(text(events)).toBe('');
  });

  it('proposes only changes the person could make, and refuses with the reason when they can’t', async () => {
    setRoles('editor');
    const events = await collect('acme', { prompt: 'Move overdue records with a renewal to pending', context: { kind: 'records', status: 'overdue' } });
    const proposal = events.find((e) => e.type === 'proposal');
    expect(proposal?.type === 'proposal' && proposal.changes.length).toBeGreaterThan(0);
    for (const change of proposal?.type === 'proposal' ? proposal.changes : []) {
      const record = records.find((r) => r.id === change.recordId);
      expect(record?.status).toBe('overdue');
      expect(record?.tags).toContain('renewal');
      expect(change.after).toBe('pending');
    }
    setRoles('viewer');
    const refused = await collect('acme', { prompt: 'Move overdue records to pending', context: { kind: 'records', status: 'overdue' } });
    expect(refused.find((e) => e.type === 'proposal')).toBeUndefined();
    expect(refused[0]).toMatchObject({ type: 'refusal', reason: 'permission', message: expect.stringContaining('view-only') as string });
  });

  it('answers a 429 with an ApiError carrying the wait, and a malformed event with a ContractError', async () => {
    server.use(aiRateLimited);
    await expect(collect('acme', { prompt: 'Hi', context: { kind: 'workspace' } })).rejects.toBeInstanceOf(ApiError);
    server.resetHandlers();
    server.use(aiMalformed);
    const report = reporting.report;
    reporting.report = () => undefined;
    await expect(collect('acme', { prompt: 'Hi', context: { kind: 'workspace' } })).rejects.toBeInstanceOf(ContractError);
    reporting.report = report;
  });
});

describe('useAssistant', () => {
  const ask = async (context: Parameters<typeof useAssistant>[0]['context'], prompt: string) => {
    const hook = renderHook(() => useAssistant({ context }), { wrapper: wrapperFor(testClient()) });
    act(() => hook.result.current.ask(prompt));
    await waitFor(() => expect(hook.result.current.streaming).toBe(false));
    return hook;
  };

  it('turns a question into a user turn and a streamed assistant turn with sources', async () => {
    const { result } = await ask({ kind: 'record', id: visible?.id ?? '' }, 'Who owns it?');
    const [question, answer] = result.current.turns;
    expect(question).toMatchObject({ role: 'user', text: 'Who owns it?' });
    expect(answer).toMatchObject({ role: 'assistant', status: 'complete', sources: [{ title: 'Owner' }] });
    expect(answer?.text).toMatch(/owns it \[1\]\.$/);
  });

  it('gives each failure its own kind: rate limit, content filter, dropped connection, a malformed answer', async () => {
    const report = reporting.report;
    reporting.report = () => undefined;
    for (const [override, kind] of [
      [aiRateLimited, 'rate_limit'],
      [aiContentFiltered, 'content_filter'],
      [aiNetworkDropped, 'network'],
      [aiMalformed, 'contract'],
    ] as const) {
      server.resetHandlers();
      server.use(override);
      const { result, unmount } = await ask({ kind: 'workspace' }, 'How many records are overdue?');
      expect(result.current.turns[1]).toMatchObject({ status: 'error', failure: { kind } });
      unmount();
    }
    reporting.report = report;
  });

  it('keeps what arrived when the person stops it', async () => {
    server.use(http.post('*/api/t/:tenant/ai/respond', () => new HttpResponse(new ReadableStream({ start: (c) => c.enqueue(new TextEncoder().encode('{"type":"token","text":"Partly "}\n')) }))));
    const hook = renderHook(() => useAssistant({ context: { kind: 'workspace' } }), { wrapper: wrapperFor(testClient()) });
    act(() => hook.result.current.ask('Hello'));
    await waitFor(() => expect(hook.result.current.turns[1]?.text).toBe('Partly '));
    act(() => hook.result.current.stop());
    await waitFor(() => expect(hook.result.current.turns[1]?.status).toBe('stopped'));
    expect(hook.result.current.turns[1]?.text).toBe('Partly ');
  });
});

describe('useDraftSuggestion', () => {
  it('refuses before sending when the person can’t create records', async () => {
    setRoles('viewer');
    let requests = 0;
    server.events.on('request:start', () => {
      requests += 1;
    });
    const { result } = renderHook(() => useDraftSuggestion(), { wrapper: wrapperFor(testClient()) });
    act(() => result.current.suggest('Office lease'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.failure?.kind).toBe('forbidden');
    expect(requests).toBe(0);
    server.events.removeAllListeners();
  });

  it('streams a suggestion for an editor', async () => {
    setRoles('editor');
    const { result } = renderHook(() => useDraftSuggestion(), { wrapper: wrapperFor(testClient()) });
    act(() => result.current.suggest('Office lease: Leeds'));
    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.text).toMatch(/^Covers office lease: leeds/);
  });
});

describe('conversations', () => {
  it('lists the person’s conversations, and creates, renames and deletes them; an answer is stored and names a new chat', async () => {
    const client = testClient();
    const wrapper = wrapperFor(client);
    const list = renderHook(() => useConversations(), { wrapper });
    await waitFor(() => expect(list.result.current.data?.map((c) => c.id)).toEqual(['c-3', 'c-2', 'c-1']));

    const create = renderHook(() => useCreateConversation(), { wrapper });
    const created = await act(() => create.result.current.mutateAsync());
    const assistant = renderHook(() => useAssistant({ context: { kind: 'workspace' }, conversationId: created.id }), { wrapper });
    act(() => assistant.result.current.ask('How many records are overdue?'));
    await waitFor(() => expect(list.result.current.data?.[0]).toMatchObject({ id: created.id, title: 'How many records are overdue?' }));

    const rename = renderHook(() => useRenameConversation(), { wrapper });
    await act(() => rename.result.current.mutateAsync({ id: created.id, title: 'Overdue count' }));
    await waitFor(() => expect(list.result.current.data?.[0]?.title).toBe('Overdue count'));
    const remove = renderHook(() => useDeleteConversation(), { wrapper });
    await act(() => remove.result.current.mutateAsync(created.id));
    await waitFor(() => expect(list.result.current.data?.map((c) => c.id)).toEqual(['c-3', 'c-2', 'c-1']));
  });

  it('keeps conversations per workspace: another workspace has none of these', async () => {
    const list = renderHook(() => useConversations(), { wrapper: wrapperFor(testClient(), 'globex') });
    await waitFor(() => expect(list.result.current.data).toEqual([]));
  });
});
