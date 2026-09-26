/**
 * The assistant, as the app layer sees it: its conversations (queries and named verbs, like every
 * other resource) and the answer stream (useAssistant, useDraftSuggestion).
 *
 * Every answer is a mutation in the one cache, so a stream in flight counts as work in progress
 * (isMutating), and the gallery's settled signal waits for it to finish. The assistant has no grant
 * of its own: a request refuses with the same `can` as every control before it is sent, and the
 * server answers as the signed-in person (src/app/mocks/ai.ts).
 *
 *   verb                 presents     patches                        invalidates
 *   createConversation   pessimistic  conversation (seeds detail)    conversations
 *   renameConversation   pessimistic  conversations (the entry)      conversations
 *   deleteConversation   pessimistic  removes the detail             conversations
 *   ask (useAssistant)   streaming    its own turns, token by token  the conversation and list, when stored
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { StreamStatus } from '../../index';
import {
  deleteConversation,
  getConversation,
  listConversations,
  patchConversation,
  postConversation,
  StreamInterrupted,
  streamAssistant,
  type AiContext,
  type AiEvent,
  type AiSource,
  type ConversationSummary,
  type ProposedMove,
  type StoredMessage,
} from '../api/ai';
import { ApiError, ContractError } from '../api/client';
import type { Capability } from '../api/schemas';
import { useGrant, usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';
import { can, DENIAL_REASONS } from './permissions';

export const aiKeys = {
  conversations: (p: Partition) => [...p, 'ai-conversations', {}] as const,
  conversation: (p: Partition, id: string) => [...p, 'ai-conversation', { id }] as const,
};

/** The signed-in person's conversations in this workspace, newest first. */
export function useConversations() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: aiKeys.conversations(partition), queryFn: ({ signal }) => listConversations(tenant, signal), select: (data) => data.items });
}

export function useConversation(id: string | undefined) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: aiKeys.conversation(partition, id ?? ''), queryFn: ({ signal }) => getConversation(tenant, id ?? '', signal), enabled: id !== undefined });
}

type Summaries = { items: ConversationSummary[] };

export function useCreateConversation() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'createConversation'],
    mutationFn: () => postConversation(tenant),
    onSuccess: (created) => {
      client.setQueryData(aiKeys.conversation(partition, created.id), created);
      return client.invalidateQueries({ queryKey: aiKeys.conversations(partition) });
    },
  });
}

export function useRenameConversation() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'renameConversation'],
    mutationFn: ({ id, title }: { id: string; title: string }) => patchConversation(tenant, id, title),
    onSuccess: (renamed) => {
      client.setQueryData<Summaries>(aiKeys.conversations(partition), (current) => (current ? { items: current.items.map((c) => (c.id === renamed.id ? renamed : c)) } : current));
      return client.invalidateQueries({ queryKey: aiKeys.conversations(partition) });
    },
  });
}

export function useDeleteConversation() {
  const tenant = useTenant();
  const partition = usePartition();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'deleteConversation'],
    mutationFn: (id: string) => deleteConversation(tenant, id),
    onSuccess: ({ deleted }) => {
      client.removeQueries({ queryKey: aiKeys.conversation(partition, deleted), exact: true });
      client.setQueryData<Summaries>(aiKeys.conversations(partition), (current) => (current ? { items: current.items.filter((c) => c.id !== deleted) } : current));
      return client.invalidateQueries({ queryKey: aiKeys.conversations(partition) });
    },
  });
}

/** Why an answer failed, so each failure gets its own words and next step. */
export type AnswerFailure = 'rate_limit' | 'content_filter' | 'network' | 'forbidden' | 'not_found' | 'contract' | 'server';

export interface ToolActivity {
  id: string;
  name: string;
  status: 'running' | 'done';
  summary: string;
  detail?: string | undefined;
}

/** One turn of a conversation, as the page renders it. */
export interface AssistantTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status: StreamStatus;
  /** An ISO instant: when the turn started. */
  time: string;
  tools: ToolActivity[];
  sources: AiSource[];
  proposal?: { changes: ProposedMove[]; skipped: { recordId: string; name: string; reason: string }[] } | undefined;
  refusal?: { reason: 'out_of_scope' | 'permission'; message: string } | undefined;
  failure?: { kind: AnswerFailure; message: string } | undefined;
}

/** A turn from a stored conversation. */
export const turnFromStored = (message: StoredMessage): AssistantTurn => ({
  id: message.id,
  role: message.role,
  text: message.text,
  status: 'complete',
  time: message.at,
  tools: [],
  sources: message.sources ?? [],
});

const failureOf = (error: unknown): NonNullable<AssistantTurn['failure']> => {
  if (error instanceof StreamInterrupted) return { kind: 'network', message: 'The connection dropped before the answer finished. Nothing was changed. Retry when you’re back online.' };
  if (error instanceof ContractError) return { kind: 'contract', message: 'The answer came back in a form we couldn’t read, so it isn’t shown. Retry, or ask differently.' };
  if (error instanceof ApiError) {
    if (error.status === 429) return { kind: 'rate_limit', message: error.message };
    if (error.status === 403) return { kind: 'forbidden', message: error.message };
    if (error.status === 404) return { kind: 'not_found', message: error.message };
    return { kind: 'server', message: 'The assistant hit a problem and couldn’t answer. Try again.' };
  }
  if (error instanceof TypeError) return failureOf(new StreamInterrupted());
  return { kind: 'server', message: 'The assistant hit a problem and couldn’t answer. Try again.' };
};

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/** Fold one event into the assistant turn it belongs to. */
const apply = (turn: AssistantTurn, event: AiEvent): AssistantTurn => {
  switch (event.type) {
    case 'token':
      return { ...turn, status: 'streaming', text: turn.text + event.text };
    case 'tool':
      return { ...turn, tools: [...turn.tools.filter((t) => t.id !== event.id), { id: event.id, name: event.name, status: event.status, summary: event.summary, detail: event.detail }] };
    case 'citations':
      return { ...turn, sources: event.sources };
    case 'proposal':
      return { ...turn, proposal: { changes: event.changes, skipped: event.skipped } };
    case 'refusal':
      return { ...turn, refusal: { reason: event.reason, message: event.message } };
    case 'error':
      return { ...turn, status: 'error', failure: { kind: event.code === 'content_filter' ? 'content_filter' : 'server', message: event.message } };
    default:
      return turn.status === 'error' ? turn : { ...turn, status: 'complete' };
  }
};

/** The capability every question needs: the assistant reads records as the person. */
const ASK: Capability = 'record:read';

let turnCount = 0;
const nextTurnId = () => {
  turnCount += 1;
  return `turn-${String(turnCount)}`;
};

export interface UseAssistantOptions {
  context: AiContext;
  /** Store each exchange in this conversation. */
  conversationId?: string | undefined;
  /** Turns already there (a stored conversation). */
  initialTurns?: readonly AssistantTurn[];
}

/**
 * A conversation with the assistant: its turns, `ask`, `stop` and `retry`. Answers stream in as
 * tokens; stopping keeps what arrived. Refused before sending when the person can't read records.
 */
export function useAssistant({ context, conversationId, initialTurns = [] }: UseAssistantOptions) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  const [turns, setTurns] = useState<AssistantTurn[]>([...initialTurns]);
  const controller = useRef<AbortController | undefined>(undefined);
  const update = (id: string, change: (turn: AssistantTurn) => AssistantTurn) => setTurns((current) => current.map((t) => (t.id === id ? change(t) : t)));

  const stream = useMutation({
    mutationKey: [...partition, 'assistant'],
    mutationFn: async ({ prompt, answerId }: { prompt: string; answerId: string }) => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        if (!can(grant, ASK)) throw new ApiError(403, 'forbidden', DENIAL_REASONS[ASK]);
        await streamAssistant(tenant, { prompt, context, ...(conversationId ? { conversationId } : {}) }, (event) => update(answerId, (turn) => apply(turn, event)), abort.signal);
        update(answerId, (turn) => (turn.status === 'error' ? turn : { ...turn, status: 'complete' }));
      } catch (error) {
        if (isAbort(error) || abort.signal.aborted) update(answerId, (turn) => ({ ...turn, status: 'stopped' }));
        else update(answerId, (turn) => ({ ...turn, status: 'error', failure: failureOf(error) }));
      } finally {
        controller.current = undefined;
      }
    },
    onSettled: () =>
      conversationId
        ? Promise.all([
            client.invalidateQueries({ queryKey: aiKeys.conversation(partition, conversationId) }),
            client.invalidateQueries({ queryKey: aiKeys.conversations(partition) }),
          ])
        : undefined,
  });

  const start = (prompt: string, answerId: string) => stream.mutate({ prompt, answerId });

  const ask = (prompt: string) => {
    const now = new Date().toISOString();
    const answerId = nextTurnId();
    setTurns((current) => [
      ...current,
      { id: nextTurnId(), role: 'user', text: prompt, status: 'complete', time: now, tools: [], sources: [] },
      { id: answerId, role: 'assistant', text: '', status: 'pending', time: now, tools: [], sources: [] },
    ]);
    start(prompt, answerId);
  };

  /** Ask the question behind this answer again, in its place. */
  const retry = (answerId: string) => {
    const index = turns.findIndex((t) => t.id === answerId);
    const question = turns.slice(0, index).findLast((t) => t.role === 'user');
    if (index === -1 || !question) return;
    update(answerId, (turn) => ({ ...turn, text: '', status: 'pending', tools: [], sources: [], proposal: undefined, refusal: undefined, failure: undefined, time: new Date().toISOString() }));
    start(question.text, answerId);
  };

  return {
    turns,
    ask,
    retry,
    stop: () => controller.current?.abort(),
    streaming: stream.isPending,
    /** Start over (a new chat, or a different conversation's turns). */
    reset: (next: readonly AssistantTurn[] = []) => setTurns([...next]),
  };
}

/**
 * Inline suggestions for a draft field (the create form's description): the suggested text as it
 * streams, `suggest`, `stop` and `clear`. Needs record:create, like the form it helps with.
 */
export function useDraftSuggestion() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<StreamStatus | 'idle'>('idle');
  const [failure, setFailure] = useState<AssistantTurn['failure']>();
  const controller = useRef<AbortController | undefined>(undefined);

  const stream = useMutation({
    mutationKey: [...partition, 'draftSuggestion'],
    mutationFn: async (name: string) => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        if (!can(grant, 'record:create')) throw new ApiError(403, 'forbidden', DENIAL_REASONS['record:create']);
        await streamAssistant(
          tenant,
          { prompt: 'Suggest a description', context: { kind: 'draft', field: 'description', name } },
          (event) => {
            if (event.type === 'token') {
              setText((current) => current + event.text);
              setStatus('streaming');
            } else if (event.type === 'refusal') {
              setFailure({ kind: 'forbidden', message: event.message });
              setStatus('error');
            } else if (event.type === 'error') {
              setFailure({ kind: event.code === 'content_filter' ? 'content_filter' : 'server', message: event.message });
              setStatus('error');
            }
          },
          abort.signal,
        );
        setStatus((current) => (current === 'error' ? current : 'complete'));
      } catch (error) {
        if (isAbort(error) || abort.signal.aborted) setStatus('stopped');
        else {
          setFailure(failureOf(error));
          setStatus('error');
        }
      } finally {
        controller.current = undefined;
      }
    },
  });

  return {
    text,
    status,
    failure,
    suggest: (name: string) => {
      setText('');
      setFailure(undefined);
      setStatus('pending');
      stream.mutate(name);
    },
    stop: () => controller.current?.abort(),
    clear: () => {
      controller.current?.abort();
      setText('');
      setFailure(undefined);
      setStatus('idle');
    },
  };
}
