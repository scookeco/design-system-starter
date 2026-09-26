/**
 * The mock assistant: a scripted, deterministic "model" behind the same wrapper as every other mock
 * route (latency and failures, sign-in, the workspace, then the capability; see handle() in
 * handlers.ts). Answers stream as newline-delimited JSON events, split into word tokens.
 *
 * It holds no permissions of its own. Everything it reads or proposes goes through the grant of the
 * signed-in person in this workspace, with the same predicates as the rest of the server:
 *   read     records the grant can see (canSee: a viewer's assistant never sees drafts), in this
 *            tenant's partition only; an id from another workspace is simply not found
 *   propose  status changes only where can(grant, 'record:move', record) holds; without the
 *            capability it refuses, and names who can change that
 *   store    conversations per person, per workspace
 *
 * Pacing: with the gallery's latency above 0, tokens arrive one every TOKEN_MS; at 0 (the visual
 * suite, tests) the whole answer is queued at once, so a story settles to its finished state. The
 * overrides at the bottom pin other moments: held mid-stream, rate limited, filtered, dropped.
 */
import { delay, http, HttpResponse } from 'msw';
import type { AiContext, AiEvent, AiRequest, AiSource, Conversation, ProposedMove, StoredMessage } from '../api/ai';
import type { RecordEntity, Tenant } from '../api/schemas';
import { can, canSee, DENIAL_REASONS, type Grant } from '../model/permissions';
import { isOnLegalHold } from '../model/predicates';
import { WORKSPACES } from '../workspaces';
import { mockConfig } from './config';
import { currentUserId, db } from './db';
import { error, handle } from './handlers';
import { SEED_EPOCH } from './seed';

const API = '*/api/t/:tenant/ai';
const TOKEN_MS = 30;
const MINUTE = 60_000;

// ---------------------------------------------------------------------------------------------
// Conversations: kept beside each tenant's partition, so resetDb() (a fresh partition) resets them.

interface AiStore {
  conversations: Map<string, Conversation[]>;
  nextId: number;
}
const stores = new WeakMap<object, AiStore>();

const at = (minutesBeforeSeed: number) => new Date(SEED_EPOCH - minutesBeforeSeed * MINUTE).toISOString();

const seedConversations = (tenant: Tenant): Conversation[] =>
  tenant === 'acme'
    ? [
        {
          id: 'c-3',
          title: 'Overdue records this month',
          updatedAt: at(45),
          messages: [
            { id: 'c-3-1', role: 'user', text: 'How many records are overdue?', at: at(46) },
            {
              id: 'c-3-2',
              role: 'assistant',
              text: 'There are **24 overdue records** you can see in Acme [1]. The oldest has been overdue since June.',
              at: at(45),
              sources: [{ title: 'Records: Open, overdue', origin: 'Records list', href: '/records?view=open&status=overdue', hrefLabel: 'Open the list' }],
            },
          ],
        },
        {
          id: 'c-2',
          title: 'Renewals due in October',
          updatedAt: at(60 * 26),
          messages: [
            { id: 'c-2-1', role: 'user', text: 'What renews in October?', at: at(60 * 26 + 1) },
            { id: 'c-2-2', role: 'assistant', text: 'Nine records renew in October. The largest is **Master hosting schedule**.', at: at(60 * 26) },
          ],
        },
        { id: 'c-1', title: 'Summarise Northwind Traders', updatedAt: at(60 * 24 * 6), messages: [] },
      ]
    : [];

const storeFor = (tenant: Tenant): AiStore => {
  const partition = db(tenant);
  let store = stores.get(partition);
  if (!store) {
    store = { conversations: new Map([[currentUserId(), seedConversations(tenant)]]), nextId: 4 };
    stores.set(partition, store);
  }
  return store;
};

const myConversations = (tenant: Tenant) => {
  const store = storeFor(tenant);
  const mine = store.conversations.get(currentUserId()) ?? [];
  store.conversations.set(currentUserId(), mine);
  return mine;
};

// ---------------------------------------------------------------------------------------------
// The scripted model. Every answer is built from what the grant can see, and cites where it came from.

interface Answer {
  events: AiEvent[];
  /** The text the answer streams, split into tokens. */
  text: string;
  sources?: AiSource[];
}

const OUT_OF_SCOPE = /\b(weather|joke|poem|recipe|stock price|password)\b/i;
const OTHER_WORKSPACE = (tenant: Tenant) => {
  const others = (Object.keys(WORKSPACES) as Tenant[]).filter((t) => t !== tenant).map((t) => WORKSPACES[t].name);
  return new RegExp(`\\b(${others.join('|')})\\b`, 'i');
};

const refuse = (reason: 'out_of_scope' | 'permission', message: string): Answer => ({ events: [{ type: 'refusal', reason, message }], text: '' });

const dateText = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
const money = (record: RecordEntity) => new Intl.NumberFormat('en', { style: 'currency', currency: record.amount.currency, maximumFractionDigits: 0 }).format(record.amount.minor / 100);

const field = (record: RecordEntity, title: string, excerpt: string): AiSource => ({ title, origin: 'Record field', excerpt, href: `/records/${record.id}`, hrefLabel: 'Show in record' });
const activity = (record: RecordEntity): AiSource => ({
  title: `Status set to ${record.status}`,
  origin: `Activity · ${dateText(record.updatedAt)}`,
  href: `/records/${record.id}/activity`,
  hrefLabel: 'Open activity',
});

function answerRecord(tenant: Tenant, grant: Grant, prompt: string, id: string): Answer | Response {
  const record = db(tenant).records.find((r) => r.id === id && canSee(grant, r));
  if (!record) return error(404, 'not_found', 'This record doesn’t exist, or you can’t see it.');
  const owner = db(tenant).people.find((p) => p.id === record.ownerId)?.name ?? 'someone';
  const read: AiEvent = { type: 'tool', id: 't-read', name: 'Read record', status: 'done', summary: `Read ${record.name} and its activity` };
  const q = prompt.toLowerCase();
  if (/renew/.test(q)) {
    const sources = [field(record, 'Renews on', dateText(record.renewsOn)), activity(record)];
    return { events: [read], text: `It renews on **${dateText(record.renewsOn)}** [1]. It was last set to ${record.status} on ${dateText(record.updatedAt)} [2].`, sources };
  }
  if (/\b(own|owner|who)\b/.test(q)) {
    return { events: [read], text: `**${owner}** owns it [1].`, sources: [field(record, 'Owner', owner)] };
  }
  if (/amount|worth|value|price|cost/.test(q)) {
    return { events: [read], text: `It’s worth **${money(record)}** [1].`, sources: [field(record, 'Amount', money(record))] };
  }
  const hold = isOnLegalHold(record) ? ' It’s on legal hold, so it can’t be deleted.' : '';
  const sources = [field(record, 'Status', record.status), field(record, 'Owner', owner), field(record, 'Amount', money(record)), field(record, 'Renews on', dateText(record.renewsOn))];
  return {
    events: [read],
    text: `**${record.name}** is ${record.status} [1], owned by ${owner} [2].\n\n- Worth ${money(record)} [3]\n- Renews on ${dateText(record.renewsOn)} [4]\n\n${hold ? hold.trim() : 'Nothing on it needs attention right now.'}`,
    sources,
  };
}

/** The agent: proposes status changes to the records the person could change themselves. */
function proposeMoves(tenant: Tenant, grant: Grant, status: RecordEntity['status']): Answer {
  if (!can(grant, 'record:move')) return refuse('permission', `I can’t propose changes for you. ${DENIAL_REASONS['record:move']}`);
  const visible = db(tenant).records.filter((r) => canSee(grant, r) && r.status === status);
  const candidates = visible.filter((r) => r.tags.includes('renewal')).sort((a, b) => a.name.localeCompare(b.name));
  const changes: ProposedMove[] = [];
  const skipped: { recordId: string; name: string; reason: string }[] = [];
  for (const record of candidates) {
    if (can(grant, 'record:move', record)) {
      changes.push({ recordId: record.id, name: record.name, before: record.status, after: 'pending', version: record.version, reason: 'Tagged renewal: a renewal is on file, so it’s waiting on approval rather than overdue.' });
    } else skipped.push({ recordId: record.id, name: record.name, reason: 'You can’t move it.' });
  }
  const events: AiEvent[] = [
    { type: 'tool', id: 't-search', name: 'Search records', status: 'done', summary: `Found ${String(visible.length)} ${status} records you can see`, detail: `Filter: status is ${status}. Drafts are included only if you can see drafts.` },
    { type: 'tool', id: 't-check', name: 'Check permissions', status: 'done', summary: `You can move ${String(changes.length)} of the ${String(candidates.length)} tagged renewal` },
    { type: 'proposal', changes, skipped },
  ];
  const text =
    changes.length === 0
      ? `None of the ${String(visible.length)} ${status} records has a renewal on file, so I have nothing to propose.`
      : `Of the ${String(visible.length)} ${status} records you can see, ${String(changes.length)} have a renewal on file [1]. I propose moving them to **Pending**. Review each change below; nothing changes until you apply it.`;
  return { events, text, sources: [{ title: `Records: ${status}`, origin: 'Records list', href: `/records?view=open&status=${status}`, hrefLabel: 'Open the list' }] };
}

function draftDescription(grant: Grant, name: string): Answer {
  if (!can(grant, 'record:create')) return refuse('permission', DENIAL_REASONS['record:create']);
  const subject = name.trim() === '' ? 'this record' : name.trim().toLowerCase();
  return { events: [], text: `Covers ${subject}: scope, pricing and service levels. Renews each year unless either side gives sixty days’ notice.` };
}

function answerWorkspace(tenant: Tenant, grant: Grant, prompt: string): Answer {
  const records = db(tenant).records.filter((r) => canSee(grant, r));
  const q = prompt.toLowerCase();
  if (/overdue/.test(q)) {
    const overdue = records.filter((r) => r.status === 'overdue').length;
    return {
      events: [{ type: 'tool', id: 't-count', name: 'Count records', status: 'done', summary: 'Counted overdue records you can see' }],
      text: `There are **${String(overdue)} overdue records** you can see in ${WORKSPACES[tenant].name} [1].`,
      sources: [{ title: 'Records: Open, overdue', origin: 'Records list', href: '/records?view=open&status=overdue', hrefLabel: 'Open the list' }],
    };
  }
  return {
    events: [],
    text: `I can answer questions about the ${String(records.length)} records you can see in ${WORKSPACES[tenant].name}: how many are overdue, what renews soon, or a summary of one record.`,
  };
}

const respond = (tenant: Tenant, grant: Grant, body: AiRequest): Answer | Response => {
  if (OUT_OF_SCOPE.test(body.prompt)) return refuse('out_of_scope', 'I can only help with records in this workspace, so I can’t answer that.');
  // Tenant isolation: other workspaces aren't in this conversation's reach, even for a member of both.
  if (OTHER_WORKSPACE(tenant).test(body.prompt)) return refuse('out_of_scope', `I can only see ${WORKSPACES[tenant].name}. Switch workspace to ask about another one.`);
  const context: AiContext = body.context;
  switch (context.kind) {
    case 'record':
      return answerRecord(tenant, grant, body.prompt, context.id);
    case 'records':
      return proposeMoves(tenant, grant, context.status);
    case 'draft':
      return draftDescription(grant, context.name);
    default:
      return answerWorkspace(tenant, grant, body.prompt);
  }
};

// ---------------------------------------------------------------------------------------------
// Streaming.

const tokens = (text: string) => text.match(/\S+\s*|\s+/g) ?? [];
const line = (event: AiEvent) => `${JSON.stringify(event)}\n`;

export interface StreamPlan {
  /** Stop after this many tokens and hold the stream open (a pinned mid-stream story). */
  holdAfter?: number;
  /** After this many tokens, end with an error event (content filter). */
  filterAfter?: number;
  /** After this many tokens, drop the connection (a network failure). */
  dropAfter?: number;
}

const streamAnswer = (answer: Answer, plan: StreamPlan, onDone?: () => void) => {
  const encoder = new TextEncoder();
  const paced = mockConfig.latencyMs > 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AiEvent) => controller.enqueue(encoder.encode(line(event)));
      for (const event of answer.events.filter((e) => e.type === 'tool' || e.type === 'refusal')) send(event);
      // Sources first, as retrieval-grounded models do: a citation is a working link from the moment it appears.
      if (answer.sources?.length) send({ type: 'citations', sources: answer.sources });
      if (paced && answer.events.length > 0) await delay(TOKEN_MS * 4);
      const words = tokens(answer.text);
      for (const [index, word] of words.entries()) {
        if (cancelled) return;
        if (plan.holdAfter === index) return; // Never closes: the answer stays mid-stream.
        if (plan.filterAfter === index) {
          send({ type: 'error', code: 'content_filter', message: 'The answer was stopped by the content filter. Try rephrasing the question.' });
          controller.close();
          return;
        }
        if (plan.dropAfter === index) {
          controller.error(new TypeError('Network connection lost'));
          return;
        }
        send({ type: 'token', text: word });
        if (paced) await delay(TOKEN_MS);
      }
      if (cancelled) return;
      for (const event of answer.events.filter((e) => e.type === 'proposal')) send(event);
      send({ type: 'done' });
      onDone?.();
      controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  return new HttpResponse(body, { headers: { 'Content-Type': 'application/x-ndjson' } });
};

/** Store a finished exchange in its conversation; name a new conversation after its first question. */
const remember = (tenant: Tenant, body: AiRequest, answer: Answer) => {
  const conversation = myConversations(tenant).find((c) => c.id === body.conversationId);
  if (!conversation) return;
  const now = new Date(SEED_EPOCH + (conversation.messages.length + 1) * 1000).toISOString();
  const user: StoredMessage = { id: `${conversation.id}-${String(conversation.messages.length + 1)}`, role: 'user', text: body.prompt, at: now };
  const refusal = answer.events.find((e) => e.type === 'refusal');
  const reply: StoredMessage = {
    id: `${conversation.id}-${String(conversation.messages.length + 2)}`,
    role: 'assistant',
    text: refusal?.type === 'refusal' ? refusal.message : answer.text,
    at: now,
    ...(answer.sources ? { sources: answer.sources } : {}),
  };
  conversation.messages.push(user, reply);
  if (conversation.title === 'New chat') conversation.title = body.prompt.length > 48 ? `${body.prompt.slice(0, 47)}…` : body.prompt;
  conversation.updatedAt = now;
};

const readBody = async (request: Request): Promise<AiRequest | undefined> => {
  const body = (await request.json().catch(() => undefined)) as Partial<AiRequest> | undefined;
  return body && typeof body.prompt === 'string' && body.prompt.trim() !== '' && body.context ? (body as AiRequest) : undefined;
};

const respondRoute = (plan: StreamPlan = {}) =>
  http.post(
    `${API}/respond`,
    // The assistant reads workspace records, so it needs record:read, like the list. It gets nothing more.
    handle('record:read', async ({ tenant, grant, request }) => {
      const body = await readBody(request);
      if (!body) return error(422, 'invalid', 'Ask a question.');
      const answer = respond(tenant, grant, body);
      if (answer instanceof Response) return answer;
      return streamAnswer(answer, plan, () => remember(tenant, body, answer));
    }),
  );

export const aiHandlers = [
  respondRoute(),

  http.get(
    `${API}/conversations`,
    handle('record:read', ({ tenant }) =>
      HttpResponse.json({ items: [...myConversations(tenant)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(({ id, title, updatedAt }) => ({ id, title, updatedAt })) }),
    ),
  ),

  http.get(
    `${API}/conversations/:id`,
    handle('record:read', ({ tenant, params }) => {
      const conversation = myConversations(tenant).find((c) => c.id === params.id);
      return conversation ? HttpResponse.json(conversation) : error(404, 'not_found', 'This conversation doesn’t exist, or was deleted.');
    }),
  ),

  http.post(
    `${API}/conversations`,
    handle('record:read', ({ tenant }) => {
      const store = storeFor(tenant);
      const conversation: Conversation = { id: `c-${String(store.nextId)}`, title: 'New chat', updatedAt: new Date(SEED_EPOCH).toISOString(), messages: [] };
      store.nextId += 1;
      myConversations(tenant).unshift(conversation);
      return HttpResponse.json(conversation, { status: 201 });
    }),
  ),

  http.patch(
    `${API}/conversations/:id`,
    handle('record:read', async ({ tenant, request, params }) => {
      const conversation = myConversations(tenant).find((c) => c.id === params.id);
      if (!conversation) return error(404, 'not_found', 'This conversation doesn’t exist, or was deleted.');
      const body = (await request.json().catch(() => ({}))) as { title?: string };
      const title = body.title?.trim();
      if (!title) return error(422, 'invalid', 'Name the conversation.');
      conversation.title = title;
      return HttpResponse.json({ id: conversation.id, title: conversation.title, updatedAt: conversation.updatedAt });
    }),
  ),

  http.delete(
    `${API}/conversations/:id`,
    handle('record:read', ({ tenant, params }) => {
      const mine = myConversations(tenant);
      const index = mine.findIndex((c) => c.id === params.id);
      if (index === -1) return error(404, 'not_found', 'This conversation doesn’t exist, or was deleted.');
      mine.splice(index, 1);
      return HttpResponse.json({ deleted: String(params.id) });
    }),
  ),
];

// ---------------------------------------------------------------------------------------------
// Story and test overrides: pin a moment or a failure. Put them in front of the defaults
// (mswOverrides(...)); a held stream never finishes, so tag that story `busy`.

/** Streams this many tokens, then holds the answer open: a mid-stream screenshot. */
export const aiHoldAfter = (tokenCount: number) => respondRoute({ holdAfter: tokenCount });

/** A 429 before anything streams, with when to try again. */
export const aiRateLimited = http.post(`${API}/respond`, () =>
  HttpResponse.json({ error: { code: 'rate_limited', message: 'You’ve asked a lot of questions in a short time. Try again in 30 seconds.' } }, { status: 429, headers: { 'Retry-After': '30' } }),
);

/** Streams a few tokens, then the content filter stops it. */
export const aiContentFiltered = respondRoute({ filterAfter: 6 });

/** Streams a few tokens, then the connection drops. */
export const aiNetworkDropped = respondRoute({ dropAfter: 6 });

/** A 200 whose events break the contract: the answer ends in an error, and nothing unparsed renders. */
export const aiMalformed = http.post(`${API}/respond`, () => new HttpResponse('{"type":"token","text":"Hello"}\n{"type":"shout","text":42}\n', { headers: { 'Content-Type': 'application/x-ndjson' } }));

/** No conversations yet: the history is empty. */
export const aiNoHistory = http.get(`${API}/conversations`, () => HttpResponse.json({ items: [] }));
