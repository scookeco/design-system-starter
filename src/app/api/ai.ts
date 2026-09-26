/**
 * The assistant's contract and transport. Answers stream as newline-delimited JSON events, and each
 * event is parsed against AiEventSchema as it arrives: model output is untrusted input, so a line
 * that breaks the contract is reported and ends the answer as an error, like any bad response.
 *
 * The assistant has no permissions of its own. Every request runs as the signed-in person, inside
 * their workspace: the server reads only what their grant can see and proposes only what their
 * grant can do (see src/app/mocks/ai.ts).
 */
import { z } from 'zod';
import { ApiError, ContractError, reporting, request } from './client';
import { ErrorBodySchema, MOVABLE_STATUSES, RecordStatusSchema, type Tenant } from './schemas';

/** Where a source comes from, so a citation can click through to it. */
export const AiSourceSchema = z.object({
  title: z.string().min(1),
  origin: z.string().min(1),
  excerpt: z.string().optional(),
  /** An in-app path (never an external URL from the model). */
  href: z.string().startsWith('/').optional(),
  hrefLabel: z.string().optional(),
});
export type AiSource = z.infer<typeof AiSourceSchema>;

/** One status change the assistant proposes. Nothing happens until the person accepts and applies it. */
export const ProposedMoveSchema = z.object({
  recordId: z.string().min(1),
  name: z.string().min(1),
  before: RecordStatusSchema,
  after: z.enum(MOVABLE_STATUSES),
  /** The version it was proposed against: applying sends it, so a stale proposal gets a 409. */
  version: z.number().int().nonnegative(),
  reason: z.string(),
});
export type ProposedMove = z.infer<typeof ProposedMoveSchema>;

export const AiEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('token'), text: z.string() }),
  z.object({ type: z.literal('tool'), id: z.string(), name: z.string(), status: z.enum(['running', 'done']), summary: z.string(), detail: z.string().optional() }),
  z.object({ type: z.literal('citations'), sources: z.array(AiSourceSchema) }),
  z.object({
    type: z.literal('proposal'),
    changes: z.array(ProposedMoveSchema),
    skipped: z.array(z.object({ recordId: z.string(), name: z.string(), reason: z.string() })),
  }),
  /** The assistant declines: outside its scope, or beyond the person's permissions. Not an error. */
  z.object({ type: z.literal('refusal'), reason: z.enum(['out_of_scope', 'permission']), message: z.string() }),
  /** It started but couldn't finish (a content filter stopped it). The text so far stays. */
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
  z.object({ type: z.literal('done') }),
]);
export type AiEvent = z.infer<typeof AiEventSchema>;

/** What the assistant is asked about. Ids and filters only: the server reads the data itself, as the person. */
export type AiContext =
  | { kind: 'record'; id: string }
  | { kind: 'records'; status: z.infer<typeof RecordStatusSchema> }
  | { kind: 'draft'; field: 'description'; name: string }
  | { kind: 'workspace' };

export interface AiRequest {
  prompt: string;
  context: AiContext;
  /** Store the exchange in this conversation (the chat page). */
  conversationId?: string;
}

/** The network failed mid-answer (not a server response): the text so far stays, with Retry. */
export class StreamInterrupted extends Error {
  constructor() {
    super('The connection dropped before the answer finished.');
    this.name = 'StreamInterrupted';
  }
}

const url = (tenant: Tenant) => new URL(`/api/t/${tenant}/ai/respond`, globalThis.location?.origin ?? 'http://localhost').toString();

/**
 * Ask, and hand each event to `onEvent` as it arrives. Resolves when the stream ends; rejects with
 * ApiError for a refused request (403, 429 with its message), ContractError for a malformed event,
 * StreamInterrupted when the connection drops, and the abort reason when `signal` aborts.
 */
export async function streamAssistant(tenant: Tenant, body: AiRequest, onEvent: (event: AiEvent) => void, signal?: AbortSignal): Promise<void> {
  const response = await fetch(url(tenant), {
    method: 'POST',
    headers: { Accept: 'application/x-ndjson', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok || !response.body) {
    const json: unknown = await response.json().catch(() => undefined);
    const parsed = ErrorBodySchema.safeParse(json);
    if (parsed.success) throw new ApiError(response.status, parsed.data.error.code, parsed.data.error.message);
    throw new ApiError(response.status, 'unknown', `The server answered ${String(response.status)}.`);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  // Stopping ends the read at once, whatever the transport does with the fetch's own signal.
  signal?.addEventListener('abort', () => void reader.cancel(signal.reason).catch(() => undefined), { once: true });
  let buffer = '';
  const emit = (line: string) => {
    if (line.trim() === '') return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      json = undefined;
    }
    const parsed = AiEventSchema.safeParse(json);
    if (!parsed.success) {
      const error = new ContractError('/ai/respond', parsed.error.issues);
      reporting.report(error);
      throw error;
    }
    onEvent(parsed.data);
  };
  for (;;) {
    let chunk: ReadableStreamReadResult<string>;
    try {
      chunk = await reader.read();
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new StreamInterrupted();
    }
    if (chunk.done) {
      if (signal?.aborted) throw signal.reason;
      break;
    }
    buffer += chunk.value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) emit(line);
  }
  emit(buffer);
}

export const ConversationSummarySchema = z.object({ id: z.string().min(1), title: z.string().min(1), updatedAt: z.iso.datetime({ offset: true }) });
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const StoredMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  at: z.iso.datetime({ offset: true }),
  sources: z.array(AiSourceSchema).optional(),
});
export type StoredMessage = z.infer<typeof StoredMessageSchema>;

export const ConversationSchema = ConversationSummarySchema.extend({ messages: z.array(StoredMessageSchema) });
export type Conversation = z.infer<typeof ConversationSchema>;
export const ConversationsSchema = z.object({ items: z.array(ConversationSummarySchema) });

const base = (tenant: Tenant) => `/t/${tenant}/ai/conversations`;

export const listConversations = (tenant: Tenant, signal?: AbortSignal) => request(ConversationsSchema, base(tenant), { signal });
export const getConversation = (tenant: Tenant, id: string, signal?: AbortSignal) => request(ConversationSchema, `${base(tenant)}/${encodeURIComponent(id)}`, { signal });
export const postConversation = (tenant: Tenant) => request(ConversationSchema, base(tenant), { method: 'POST', body: {} });
export const patchConversation = (tenant: Tenant, id: string, title: string) =>
  request(ConversationSummarySchema, `${base(tenant)}/${encodeURIComponent(id)}`, { method: 'PATCH', body: { title } });
export const deleteConversation = (tenant: Tenant, id: string) =>
  request(z.object({ deleted: z.string() }), `${base(tenant)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
