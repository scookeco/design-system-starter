/**
 * The mock server for the inbox and the admin console: seeded, deterministic, per tenant and
 * permission-aware, like the records handlers. Its state hangs off the tenant's database
 * partition (a WeakMap keyed by it), so it's reset whenever the database is (before every story
 * and test) without anything else having to know it exists.
 *
 * Every member write emits an audit event from here, the write path, denied attempts included:
 * the log is a projection of the mutations, not something each page remembers to write.
 */
import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw';
import { AUDIT_ACTIONS, type AuditAction, type AuditEvent, type Member } from '../api/admin';
import { INBOX_KINDS, TRIAGE_ACTIONS, type InboxItem, type InboxKind, type TriageAction } from '../api/inbox';
import { RoleSchema, TenantSchema, type Capability, type RecordEntity, type Role, type Tenant } from '../api/schemas';
import { isEmail, removalBlocked, roleChangeBlocked } from '../model/members';
import { can, canSee, DENIAL_REASONS, type Grant } from '../model/permissions';
import { mockConfig } from './config';
import { currentSession, db, grantFor, isSignedIn } from './db';
import { SEED_EPOCH, seededRandom, seedPeople, seedRecords, TENANT_SPECS } from './seed';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

interface B2bState {
  inbox: InboxItem[];
  members: Member[];
  audit: AuditEvent[];
  nextMember: number;
  nextEvent: number;
  /** Writes move the clock a minute past the seed's "now", deterministically. */
  writes: number;
}

// ---- seed ------------------------------------------------------------------------------------

const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

const SUBJECTS: Record<InboxKind, (from: string, record: string) => string> = {
  mention: (from, record) => `${from} mentioned you on ${record}`,
  assignment: (from, record) => `${from} assigned ${record} to you`,
  approval: (_from, record) => `Approval needed: ${record}`,
  comment: (from, record) => `${from} commented on ${record}`,
  renewal: (_from, record) => `${record} renews soon`,
};
const BODIES: Record<InboxKind, string> = {
  mention: 'Can you check the amount before Friday? The account asked for a revised quote.',
  assignment: 'You’re the owner now. The previous owner left notes in the activity tab.',
  approval: 'Legal signed off. It needs your approval before it goes to the customer.',
  comment: 'Updated the renewal terms to match the new pricing. Let me know if that works.',
  renewal: 'It renews automatically unless someone cancels it. Review the terms first.',
};

/** Inbox items draw from their own PRNG stream (seed + 3), so records, accounts and people are untouched. */
const seedInbox = (tenant: Tenant): InboxItem[] => {
  const random = seededRandom(TENANT_SPECS[tenant].seed + 3);
  const people = seedPeople(tenant).slice(1);
  const records = seedRecords(tenant);
  let at = SEED_EPOCH - 20 * 60 * 1000;
  return Array.from({ length: 32 }, (_, index) => {
    const kind = pick(random, INBOX_KINDS);
    const from = pick(random, people);
    const record = pick(random, records);
    at -= Math.floor(random() * 14 * HOUR) + 30 * 60 * 1000;
    const body = BODIES[kind];
    return {
      id: `${tenant}-i${String(index + 1).padStart(3, '0')}`,
      kind,
      subject: SUBJECTS[kind](from.name, record.name),
      preview: body.split('. ')[0] ?? body,
      body,
      fromId: from.id,
      recordId: record.id,
      receivedAt: new Date(at).toISOString(),
      // The newest few are unread; older ones mostly read.
      read: index < 3 ? false : random() < 0.75,
      archived: index > 8 && random() < 0.25,
    };
  });
};

const ROLE_CYCLE: readonly Role[] = ['admin', 'editor', 'editor', 'viewer', 'viewer', 'editor'];

/** The signed-in person's role here, as the identity provider says (the session), not stored with the members. */
const myRole = (tenant: Tenant): Role => currentSession().memberships.find((m) => m.tenant === tenant)?.role ?? 'viewer';
const ME = () => currentSession().user;

/** Members: the directory's people with a role each (their own PRNG stream, seed + 4), plus two open invitations. */
const seedMembers = (tenant: Tenant): Member[] => {
  const random = seededRandom(TENANT_SPECS[tenant].seed + 4);
  const people = seedPeople(tenant);
  const me = ME();
  const members: Member[] = people.map((person, index) => ({
    id: `${tenant}-m${String(index + 1).padStart(2, '0')}`,
    personId: person.id,
    email: person.email,
    role: ROLE_CYCLE[index % ROLE_CYCLE.length] as Role,
    status: 'active',
    isYou: person.email === me.email,
    invitedAt: null,
    lastActiveAt: new Date(SEED_EPOCH - Math.floor(random() * 30 * DAY)).toISOString(),
    version: 1,
  }));
  if (!members.some((m) => m.isYou)) {
    members.unshift({
      id: `${tenant}-m00`,
      personId: null,
      email: me.email,
      role: 'viewer',
      status: 'active',
      isYou: true,
      invitedAt: null,
      lastActiveAt: new Date(SEED_EPOCH).toISOString(),
      version: 1,
    });
  }
  const invites = tenant === 'acme' ? ['new.hire@example.com', 'contractor@partner.example'] : ['neu@example.com'];
  invites.forEach((email, i) =>
    members.push({
      id: `${tenant}-m${String(90 + i)}`,
      personId: null,
      email,
      role: i === 0 ? 'editor' : 'viewer',
      status: 'invited',
      isYou: false,
      invitedAt: new Date(SEED_EPOCH - (i + 2) * DAY).toISOString(),
      lastActiveAt: null,
      version: 1,
    }),
  );
  return members;
};

const API_KEY = { type: 'api-key' as const, id: 'ak_7f3c', label: 'Deploy key ak_7f3c…' };
const SYSTEM = { type: 'system' as const, id: 'system', label: 'System' };

/** The audit log's history (its own PRNG stream, seed + 5): newest first, like the live log. */
const seedAudit = (tenant: Tenant): AuditEvent[] => {
  const random = seededRandom(TENANT_SPECS[tenant].seed + 5);
  const people = seedPeople(tenant);
  const records = seedRecords(tenant);
  const count = tenant === 'acme' ? 140 : 90;
  let at = SEED_EPOCH - 45 * 60 * 1000;
  const events: AuditEvent[] = [];
  for (let i = 0; i < count; i += 1) {
    at -= Math.floor(random() * 10 * HOUR) + 5 * 60 * 1000;
    const roll = random();
    const person = pick(random, people);
    const actor = roll < 0.08 ? SYSTEM : roll < 0.14 ? API_KEY : { type: 'person' as const, id: person.id, label: person.name };
    const action: AuditAction =
      actor.type === 'system'
        ? pick(random, ['record.archived', 'session.signed_in'] as const)
        : actor.type === 'api-key'
          ? pick(random, ['record.created', 'record.renamed'] as const)
          : pick(random, AUDIT_ACTIONS);
    const record = pick(random, records);
    const other = pick(random, people);
    const target = action.startsWith('member.')
      ? { type: 'member' as const, id: other.id, label: other.name }
      : action.startsWith('api_key.')
        ? { type: 'api-key' as const, id: 'ak_7f3c', label: 'Deploy key ak_7f3c…' }
        : action === 'session.signed_in'
          ? { type: 'workspace' as const, id: tenant, label: tenant === 'acme' ? 'Acme' : 'Globex' }
          : action === 'account.updated'
            ? { type: 'account' as const, id: `${tenant}-a01`, label: TENANT_SPECS[tenant].accounts[0]?.[0] ?? 'Account' }
            : { type: 'record' as const, id: record.id, label: record.name };
    const changes =
      action === 'member.role_changed'
        ? [{ field: 'role', before: 'viewer', after: pick(random, ['editor', 'admin'] as const) }]
        : action === 'record.renamed'
          ? [{ field: 'name', before: `Draft ${record.name.toLowerCase()}`, after: record.name }]
          : [];
    events.push({
      id: `${tenant}-e${String(count - i).padStart(4, '0')}`,
      at: new Date(at).toISOString(),
      actor,
      action,
      target,
      outcome: random() < 0.05 ? 'denied' : 'success',
      ip: actor.type === 'system' ? null : `${actor.type === 'api-key' ? '198.51.100' : '203.0.113'}.${String(Math.floor(random() * 250) + 2)}`,
      changes,
    });
  }
  return events;
};

// ---- state -----------------------------------------------------------------------------------

const states = new WeakMap<object, B2bState>();

const state = (tenant: Tenant): B2bState => {
  const partition = db(tenant);
  let found = states.get(partition);
  if (!found) {
    const audit = seedAudit(tenant);
    found = { inbox: seedInbox(tenant), members: seedMembers(tenant), audit, nextMember: 100, nextEvent: audit.length + 1, writes: 0 };
    states.set(partition, found);
  }
  // The signed-in person's role is the session's: follow it (the gallery's Role toolbar, a test's setRoles).
  const role = myRole(tenant);
  found.members = found.members.map((m) => (m.isYou && m.role !== role ? { ...m, role } : m));
  return found;
};

const now = (s: B2bState) => new Date(SEED_EPOCH + s.writes * 60 * 1000).toISOString();

/** Append an event to the log. Called by every member write, before it answers. */
const audit = (tenant: Tenant, s: B2bState, event: Omit<AuditEvent, 'id' | 'at' | 'actor' | 'ip'>) => {
  s.writes += 1;
  const me = ME();
  const person = seedPeople(tenant).find((p) => p.email === me.email);
  s.audit.unshift({
    id: `${tenant}-e${String(s.nextEvent).padStart(4, '0')}`,
    at: now(s),
    actor: { type: 'person', id: person?.id ?? me.id, label: me.name },
    ip: '203.0.113.7',
    ...event,
  });
  s.nextEvent += 1;
};

const memberLabel = (tenant: Tenant, member: Member) => seedPeople(tenant).find((p) => p.id === member.personId)?.name ?? member.email;

// ---- handlers --------------------------------------------------------------------------------

const API = '*/api/t/:tenant';

const error = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status });

const settle = async (): Promise<Response | undefined> => {
  if (mockConfig.latencyMs > 0) await delay(mockConfig.latencyMs);
  if (mockConfig.failureRate > 0 && mockConfig.random() < mockConfig.failureRate) return error(500, 'server_error', 'The server hit a problem. Try again.');
  return undefined;
};

type Resolver = (args: { tenant: Tenant; grant: Grant; request: Request; params: Record<string, string | readonly string[] | undefined> }) => Response | Promise<Response>;

/**
 * Like the records handlers: latency and failures, the session, the workspace, then the route's
 * capability. A denied write (`audited`) is logged before the 403, as a real audit log would.
 */
const handle =
  (capability: Capability, resolver: Resolver, audited?: { action: AuditAction; target: (params: Record<string, unknown>) => AuditEvent['target'] }): HttpResponseResolver =>
  async ({ request, params }) => {
    const failed = await settle();
    if (failed) return failed;
    if (!isSignedIn()) return error(401, 'signed_out', 'Sign in to continue.');
    const tenant = TenantSchema.safeParse(params.tenant);
    if (!tenant.success) return error(404, 'unknown_tenant', 'No such workspace.');
    const grant = grantFor(tenant.data);
    if (!can(grant, capability)) {
      if (audited) audit(tenant.data, state(tenant.data), { action: audited.action, target: audited.target(params), outcome: 'denied', changes: [] });
      return error(403, 'forbidden', DENIAL_REASONS[capability]);
    }
    return resolver({ tenant: tenant.data, grant, request, params });
  };

/** Inbox items about a record this grant can't see (a draft, for a viewer) are left out, like the record itself. */
const visibleInbox = (tenant: Tenant, grant: Grant) => {
  const records = new Map<string, RecordEntity>(db(tenant).records.map((r) => [r.id, r]));
  return state(tenant).inbox.filter((item) => {
    const record = item.recordId ? records.get(item.recordId) : undefined;
    return !record || canSee(grant, record);
  });
};

const inboxCounts = (items: readonly InboxItem[]) => ({
  inbox: items.filter((i) => !i.archived).length,
  unread: items.filter((i) => !i.archived && !i.read).length,
  archived: items.filter((i) => i.archived).length,
});

const TRIAGE: Record<TriageAction, (item: InboxItem) => InboxItem> = {
  read: (item) => ({ ...item, read: true }),
  unread: (item) => ({ ...item, read: false }),
  archive: (item) => ({ ...item, archived: true, read: true }),
  unarchive: (item) => ({ ...item, archived: false }),
};

/** Parse the audit filters; unknown values are ignored, like the list's URL. */
const auditFilter = (url: URL) => {
  const actions = new Set((url.searchParams.get('action') ?? '').split(','));
  const from = Date.parse(url.searchParams.get('from') ?? '');
  const to = Date.parse(url.searchParams.get('to') ?? '');
  const actor = url.searchParams.get('actor') ?? '';
  return (event: AuditEvent) =>
    (!actor || event.actor.id === actor) &&
    (actions.size === 1 && actions.has('') ? true : actions.has(event.action)) &&
    (Number.isNaN(from) || Date.parse(event.at) >= from) &&
    (Number.isNaN(to) || Date.parse(event.at) < to);
};

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

export const b2bHandlers = [
  http.get(
    `${API}/inbox`,
    handle('workspace:read', ({ tenant, grant, request }) => {
      const view = new URL(request.url).searchParams.get('view') === 'archived' ? 'archived' : 'inbox';
      const items = visibleInbox(tenant, grant);
      return HttpResponse.json({ items: items.filter((i) => i.archived === (view === 'archived')), counts: inboxCounts(items) });
    }),
  ),

  http.post(
    `${API}/inbox/triage`,
    handle('workspace:read', async ({ tenant, grant, request }) => {
      const body = (await request.json()) as Partial<{ ids: string[]; action: string }>;
      const action = TRIAGE_ACTIONS.find((a) => a === body.action);
      if (!action || !Array.isArray(body.ids) || body.ids.length === 0) return error(422, 'invalid', 'Choose conversations and what to do with them.');
      const visible = new Set(visibleInbox(tenant, grant).map((i) => i.id));
      const s = state(tenant);
      const updated: InboxItem[] = [];
      s.inbox = s.inbox.map((item) => {
        if (!body.ids?.includes(item.id) || !visible.has(item.id)) return item;
        const next = TRIAGE[action](item);
        updated.push(next);
        return next;
      });
      return HttpResponse.json({ items: updated });
    }),
  ),

  http.get(
    `${API}/members`,
    handle('workspace:read', ({ tenant }) => HttpResponse.json({ items: state(tenant).members })),
  ),

  http.post(
    `${API}/members`,
    handle(
      'members:manage',
      async ({ tenant, request }) => {
        const s = state(tenant);
        const body = (await request.json()) as Partial<{ email: string; role: string }>;
        const email = body.email?.trim().toLowerCase() ?? '';
        const role = RoleSchema.safeParse(body.role);
        if (!isEmail(email) || !role.success) return error(422, 'invalid', 'Enter an email address and choose a role.');
        if (s.members.some((m) => m.email === email)) return error(409, 'already_member', `${email} is already a member or has an invitation.`);
        const member: Member = {
          id: `${tenant}-m${String(s.nextMember)}`,
          personId: null,
          email,
          role: role.data,
          status: 'invited',
          isYou: false,
          invitedAt: now(s),
          lastActiveAt: null,
          version: 1,
        };
        s.nextMember += 1;
        s.members.push(member);
        audit(tenant, s, {
          action: 'member.invited',
          target: { type: 'member', id: member.id, label: email },
          outcome: 'success',
          changes: [{ field: 'role', before: null, after: role.data }],
        });
        return HttpResponse.json(member, { status: 201 });
      },
      { action: 'member.invited', target: () => ({ type: 'member', id: 'new', label: 'New invitation' }) },
    ),
  ),

  http.patch(
    `${API}/members/:id`,
    handle(
      'members:manage',
      async ({ tenant, request, params }) => {
        const s = state(tenant);
        const index = s.members.findIndex((m) => m.id === params.id);
        const current = s.members[index];
        if (!current) return error(404, 'not_found', 'This member doesn’t exist, or was removed.');
        const body = (await request.json()) as Partial<{ role: string; version: number }>;
        const role = RoleSchema.safeParse(body.role);
        if (!role.success) return error(422, 'invalid', 'Choose viewer, editor or admin.');
        const blocked = roleChangeBlocked(current, s.members, role.data);
        if (blocked) {
          audit(tenant, s, { action: 'member.role_changed', target: { type: 'member', id: current.id, label: memberLabel(tenant, current) }, outcome: 'denied', changes: [] });
          return error(409, 'blocked', blocked);
        }
        if (body.version !== current.version) return error(409, 'conflict', 'Someone else changed this member.');
        const next: Member = { ...current, role: role.data, version: current.version + 1 };
        s.members[index] = next;
        audit(tenant, s, {
          action: 'member.role_changed',
          target: { type: 'member', id: current.id, label: memberLabel(tenant, current) },
          outcome: 'success',
          changes: [{ field: 'role', before: current.role, after: role.data }],
        });
        return HttpResponse.json(next);
      },
      { action: 'member.role_changed', target: (params) => ({ type: 'member', id: String(params.id), label: String(params.id) }) },
    ),
  ),

  http.delete(
    `${API}/members/:id`,
    handle(
      'members:manage',
      ({ tenant, params }) => {
        const s = state(tenant);
        const current = s.members.find((m) => m.id === params.id);
        if (!current) return error(404, 'not_found', 'This member doesn’t exist, or was removed.');
        const blocked = removalBlocked(current, s.members);
        if (blocked) return error(409, 'blocked', blocked);
        s.members = s.members.filter((m) => m.id !== current.id);
        audit(tenant, s, {
          action: 'member.removed',
          target: { type: 'member', id: current.id, label: memberLabel(tenant, current) },
          outcome: 'success',
          changes: [{ field: 'role', before: current.role, after: null }],
        });
        return HttpResponse.json({ removed: current.id });
      },
      { action: 'member.removed', target: (params) => ({ type: 'member', id: String(params.id), label: String(params.id) }) },
    ),
  ),

  http.get(
    `${API}/audit/facets`,
    handle('audit:read', ({ tenant }) => {
      const actors = new Map<string, AuditEvent['actor']>();
      for (const event of state(tenant).audit) actors.set(event.actor.id, event.actor);
      return HttpResponse.json({ actors: [...actors.values()].sort((a, b) => a.label.localeCompare(b.label)) });
    }),
  ),

  http.get(
    `${API}/audit/export`,
    handle('audit:read', ({ tenant, request }) => {
      const events = state(tenant).audit.filter(auditFilter(new URL(request.url)));
      const header = ['id', 'time_utc', 'actor_type', 'actor', 'action', 'target_type', 'target', 'outcome', 'ip', 'changes'];
      const rows = events.map((e) =>
        [
          e.id,
          e.at,
          e.actor.type,
          e.actor.label,
          e.action,
          e.target.type,
          e.target.label,
          e.outcome,
          e.ip ?? '',
          e.changes.map((c) => `${c.field}: ${c.before ?? '∅'} → ${c.after ?? '∅'}`).join('; '),
        ]
          .map(csvCell)
          .join(','),
      );
      return HttpResponse.json({ filename: `audit-log-${tenant}.csv`, contentType: 'text/csv', content: [header.join(','), ...rows].join('\n') });
    }),
  ),

  http.get(
    `${API}/audit`,
    handle('audit:read', ({ tenant, request }) => {
      const url = new URL(request.url);
      const matches = state(tenant).audit.filter(auditFilter(url));
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') ?? '', 10) || 25));
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      const page = Math.min(pages, Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '', 10) || 1));
      return HttpResponse.json({ items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize });
    }),
  ),
];
