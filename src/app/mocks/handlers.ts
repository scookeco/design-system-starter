/**
 * The mock API: MSW request handlers over the in-memory database. It behaves like a real server:
 * search, filter, sort and paging happen here, `total` counts every match, writes bump a version,
 * a stale edit gets a 409, a replayed create returns the first result, and bulk deletes can
 * partly fail. Latency and failures come from mockConfig, and failures are real HTTP errors.
 *
 * The same handlers serve Storybook (msw/browser via msw-storybook-addon) and Vitest (msw/node).
 */
import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw';
import type { AccountInput } from '../api/accounts';
import {
  MOVABLE_STATUSES,
  RECORD_STATUSES,
  RECORD_VIEWS,
  RecordStatusSchema,
  RecordViewSchema,
  TenantSchema,
  type Account,
  type Capability,
  type RecordEntity,
  type RecordFilter,
  type RecordStatus,
  type RecordView,
  type SortKey,
  type Tenant,
} from '../api/schemas';
import { canArchive, canDelete, canMove, canRename, hasStatus, matchesFilter, matchesSearch, type SearchableRecord } from '../model/predicates';
import { can, canSee, DENIAL_REASONS, type Grant } from '../model/permissions';
import { mockConfig } from './config';
import { bump, currentSession, db, grantFor, touch } from './db';
import { emailFor, SEED_EPOCH } from './seed';
import { WORKSPACES } from '../workspaces';

const API = '*/api/t/:tenant';

const error = (status: number, code: string, message: string, current?: RecordEntity | Account) =>
  HttpResponse.json({ error: { code, message, ...(current ? { current } : {}) } }, { status });

/** Latency, then the failure roll. */
const settle = async (): Promise<Response | undefined> => {
  if (mockConfig.latencyMs > 0) await delay(mockConfig.latencyMs);
  if (mockConfig.failureRate > 0 && mockConfig.random() < mockConfig.failureRate) {
    return error(500, 'server_error', 'The server hit a problem. Try again.');
  }
  return undefined;
};

/**
 * Latency, the failure roll, the workspace, then the capability the route requires, then the
 * handler. Every workspace route declares its capability (deny by default): the server checks it
 * against the role it holds for the signed-in person, whatever the client did or didn't check.
 * Object-level rules (archived, legal hold) are the handler's, after this.
 */
const handle =
  (
    capability: Capability,
    resolver: (args: { tenant: Tenant; grant: Grant; request: Request; params: Record<string, string | readonly string[] | undefined> }) => Response | Promise<Response>,
  ): HttpResponseResolver =>
  async ({ request, params }) => {
    const failed = await settle();
    if (failed) return failed;
    const tenant = TenantSchema.safeParse(params.tenant);
    if (!tenant.success) return error(404, 'unknown_tenant', 'No such workspace.');
    const grant = grantFor(tenant.data);
    if (!can(grant, capability)) return error(403, 'forbidden', DENIAL_REASONS[capability]);
    return resolver({ tenant: tenant.data, grant, request, params });
  };

const parseFilter = (url: URL): RecordFilter => {
  const view = RecordViewSchema.safeParse(url.searchParams.get('view') ?? 'all');
  const status = (url.searchParams.get('status') ?? '')
    .split(',')
    .flatMap((s) => {
      const parsed = RecordStatusSchema.safeParse(s);
      return parsed.success ? [parsed.data] : [];
    });
  return { q: url.searchParams.get('q') ?? '', status, view: view.success ? view.data : 'all' };
};

/** The server joins a record with its owner's name (by id) before searching, as a database would. */
const searchable = (tenant: Tenant) => {
  const names = new Map(db(tenant).people.map((p) => [p.id, p.name]));
  return (record: RecordEntity): SearchableRecord => ({ ...record, ownerName: names.get(record.ownerId) ?? '' });
};

const validAccount = (tenant: Tenant, body: Partial<AccountInput>): AccountInput | undefined => {
  const name = body.name?.trim();
  const domain = body.domain?.trim();
  const industry = body.industry?.trim();
  if (!name || !domain || !industry) return undefined;
  if (!db(tenant).people.some((p) => p.id === body.ownerId)) return undefined;
  if (typeof body.arrMinor !== 'number' || !Number.isInteger(body.arrMinor) || body.arrMinor < 0) return undefined;
  if (!body.customerSince || !/^\d{4}-\d{2}-\d{2}$/.test(body.customerSince)) return undefined;
  return { name, domain, industry, ownerId: body.ownerId as string, arrMinor: body.arrMinor, customerSince: body.customerSince };
};

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

const COMPARE: Record<SortKey, (a: RecordEntity, b: RecordEntity) => number> = {
  name: (a, b) => collator.compare(a.name, b.name),
  '-name': (a, b) => collator.compare(b.name, a.name),
  amount: (a, b) => a.amount.minor - b.amount.minor,
  '-amount': (a, b) => b.amount.minor - a.amount.minor,
  updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  '-updated': (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

const isSortKey = (value: string | null): value is SortKey => value !== null && value in COMPARE;
const clampInt = (value: string | null, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const workspaceHandlers = [
  http.get(
    `${API}/records`,
    handle('record:read', ({ tenant, grant, request }) => {
      const url = new URL(request.url);
      const filter = parseFilter(url);
      const sort = url.searchParams.get('sort');
      const pageSize = clampInt(url.searchParams.get('pageSize'), 25, 1, 100);
      const join = searchable(tenant);
      // Roles shape the projection: what this grant can't see is filtered in the query, so totals and pages stay honest.
      const matches = db(tenant)
        .records.filter((r) => canSee(grant, r) && matchesFilter(join(r), filter))
        .sort((a, b) => COMPARE[isSortKey(sort) ? sort : 'name'](a, b) || a.id.localeCompare(b.id));
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      const page = clampInt(url.searchParams.get('page'), 1, 1, pages);
      return HttpResponse.json({ items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize });
    }),
  ),

  http.get(
    `${API}/records/counts`,
    handle('record:read', ({ tenant, grant, request }) => {
      const { q, status } = parseFilter(new URL(request.url));
      const join = searchable(tenant);
      const records = db(tenant).records.filter((r) => canSee(grant, r)).map(join);
      const counts = Object.fromEntries(RECORD_VIEWS.map((view: RecordView) => [view, records.filter((r) => matchesFilter(r, { q, status, view })).length]));
      // A column's count is its whole status for this search, whatever the status filter narrows the rows to.
      const searched = records.filter((r) => matchesSearch(r, q));
      const statuses = Object.fromEntries(RECORD_STATUSES.map((s) => [s, searched.filter(hasStatus(s)).length]));
      return HttpResponse.json({ counts, statuses });
    }),
  ),

  http.get(
    `${API}/people`,
    handle('record:read', ({ tenant }) => HttpResponse.json({ items: db(tenant).people })),
  ),

  http.post(
    `${API}/people`,
    handle('people:create', async ({ tenant, request }) => {
      const partition = db(tenant);
      const body = (await request.json()) as Partial<{ name: string }>;
      const name = body.name?.trim();
      if (!name) return error(422, 'invalid', 'Enter a name.');
      const person = { id: `${tenant}-p${String(partition.people.length + 1).padStart(2, '0')}`, name, email: emailFor(name) };
      partition.people.push(person);
      return HttpResponse.json(person, { status: 201 });
    }),
  ),

  http.get(
    `${API}/records/:id`,
    handle('record:read', ({ tenant, grant, params }) => {
      const record = db(tenant).records.find((r) => r.id === params.id && canSee(grant, r));
      return record ? HttpResponse.json(record) : error(404, 'not_found', 'This record doesn’t exist, or was deleted.');
    }),
  ),

  http.post(
    `${API}/records`,
    handle('record:create', async ({ tenant, request }) => {
      const key = request.headers.get('Idempotency-Key');
      if (!key) return error(400, 'idempotency_key_required', 'Creates need an Idempotency-Key header.');
      const partition = db(tenant);
      const replay = partition.created.get(key);
      if (replay && 'status' in replay) return HttpResponse.json(replay, { status: 201 });

      const body = (await request.json()) as Partial<{ name: string; ownerId: string; accountId: string | null; amountMinor: number; renewsOn: string; tags: string[] }>;
      // Defaults for a quick create: the signed-in person owns it, no account or amount yet, renews in a year.
      const owner = body.ownerId === undefined ? partition.people[0] : partition.people.find((p) => p.id === body.ownerId);
      const accountId = body.accountId ?? null;
      const renewsOn = body.renewsOn ?? new Date(SEED_EPOCH + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      if (
        !body.name?.trim() ||
        !owner ||
        (accountId !== null && !partition.accounts.some((a) => a.id === accountId)) ||
        (body.amountMinor !== undefined && typeof body.amountMinor !== 'number')
      ) {
        return error(422, 'invalid', 'Some fields are missing or invalid.');
      }
      const currency = WORKSPACES[tenant].currency;
      const record = touch({
        id: `${tenant === 'acme' ? 'r' : 'g'}-${String(partition.nextId)}`,
        name: body.name.trim(),
        ownerId: owner.id,
        accountId,
        status: 'draft',
        amount: { minor: Math.round(body.amountMinor ?? 0), currency },
        updatedAt: new Date(SEED_EPOCH).toISOString(),
        renewsOn,
        tags: body.tags ?? [],
        version: 0,
      });
      partition.nextId += 1;
      partition.records.unshift(record);
      partition.created.set(key, record);
      return HttpResponse.json(record, { status: 201 });
    }),
  ),

  http.patch(
    `${API}/records/:id`,
    handle('record:rename', async ({ tenant, request, params }) => {
      const partition = db(tenant);
      const index = partition.records.findIndex((r) => r.id === params.id);
      const current = partition.records[index];
      if (!current) return error(404, 'not_found', 'This record doesn’t exist, or was deleted.');
      const body = (await request.json()) as Partial<{ name: string; version: number }>;
      if (!body.name?.trim()) return error(422, 'invalid', 'Enter a name.');
      if (!canRename(current)) return error(403, 'forbidden', 'Archived records can’t be renamed.');
      if (body.version !== current.version) return error(409, 'conflict', 'Someone else changed this record.', current);
      const next = touch({ ...current, name: body.name.trim() });
      partition.records[index] = next;
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    `${API}/records/:id/archive`,
    handle('record:archive', ({ tenant, params }) => {
      const partition = db(tenant);
      const index = partition.records.findIndex((r) => r.id === params.id);
      const current = partition.records[index];
      if (!current) return error(404, 'not_found', 'This record doesn’t exist, or was deleted.');
      if (!canArchive(current)) return error(409, 'already_archived', 'This record is already archived.', current);
      const next = touch({ ...current, status: 'archived' });
      partition.records[index] = next;
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    `${API}/records/:id/status`,
    handle('record:move', async ({ tenant, request, params }) => {
      const partition = db(tenant);
      const index = partition.records.findIndex((r) => r.id === params.id);
      const current = partition.records[index];
      if (!current) return error(404, 'not_found', 'This record doesn’t exist, or was deleted.');
      const body = (await request.json()) as Partial<{ status: string; version: number }>;
      const status = MOVABLE_STATUSES.find((s) => s === body.status);
      if (!status) return error(422, 'invalid', 'Choose draft, pending, active or overdue.');
      if (!canMove(current)) return error(409, 'archived', 'Archived records can’t be moved. Restore it first.', current);
      if (body.version !== current.version) return error(409, 'conflict', 'Someone else changed this record.', current);
      const next = touch({ ...current, status });
      partition.records[index] = next;
      return HttpResponse.json(next);
    }),
  ),

  http.post(
    `${API}/records/bulk-delete`,
    handle('record:delete', async ({ tenant, request }) => {
      const partition = db(tenant);
      const body = (await request.json()) as { ids?: string[]; filter?: Partial<RecordFilter> };
      const filter: RecordFilter | undefined = body.filter
        ? {
            q: body.filter.q ?? '',
            status: (body.filter.status ?? []).filter((s): s is RecordStatus => (RECORD_STATUSES as readonly string[]).includes(s)),
            view: RecordViewSchema.catch('all').parse(body.filter.view),
          }
        : undefined;
      const join = searchable(tenant);
      const targets = filter ? partition.records.filter((r) => matchesFilter(join(r), filter)) : partition.records.filter((r) => body.ids?.includes(r.id));
      const deleted: string[] = [];
      const failed: { id: string; name: string; reason: string }[] = [];
      for (const record of targets) {
        if (canDelete(record)) deleted.push(record.id);
        else failed.push({ id: record.id, name: record.name, reason: 'on legal hold' });
      }
      partition.records = partition.records.filter((r) => !deleted.includes(r.id));
      return HttpResponse.json({ deleted, failed });
    }),
  ),

  http.get(
    `${API}/accounts`,
    handle('account:read', ({ tenant }) => HttpResponse.json({ items: db(tenant).accounts })),
  ),

  http.get(
    `${API}/accounts/:id`,
    handle('account:read', ({ tenant, params }) => {
      const account = db(tenant).accounts.find((a) => a.id === params.id);
      return account ? HttpResponse.json(account) : error(404, 'not_found', 'This account doesn’t exist, or was deleted.');
    }),
  ),

  http.post(
    `${API}/accounts`,
    handle('account:create', async ({ tenant, request }) => {
      const key = request.headers.get('Idempotency-Key');
      if (!key) return error(400, 'idempotency_key_required', 'Creates need an Idempotency-Key header.');
      const partition = db(tenant);
      const replay = partition.created.get(key);
      if (replay && 'domain' in replay) return HttpResponse.json(replay, { status: 201 });
      const body = (await request.json()) as Partial<AccountInput>;
      const input = validAccount(tenant, body);
      if (!input) return error(422, 'invalid', 'Some fields are missing or invalid.');
      const { arrMinor, ...fields } = input;
      const account: Account = {
        id: `${tenant}-a${String(partition.accounts.length + 1).padStart(2, '0')}`,
        ...fields,
        arr: { minor: arrMinor, currency: WORKSPACES[tenant].currency },
        version: 1,
      };
      partition.accounts.push(account);
      partition.created.set(key, account);
      return HttpResponse.json(account, { status: 201 });
    }),
  ),

  http.patch(
    `${API}/accounts/:id`,
    handle('account:edit', async ({ tenant, request, params }) => {
      const partition = db(tenant);
      const index = partition.accounts.findIndex((a) => a.id === params.id);
      const current = partition.accounts[index];
      if (!current) return error(404, 'not_found', 'This account doesn’t exist, or was deleted.');
      const body = (await request.json()) as Partial<AccountInput> & { version?: number };
      const input = validAccount(tenant, { name: current.name, domain: current.domain, industry: current.industry, ownerId: current.ownerId, arrMinor: current.arr.minor, customerSince: current.customerSince, ...body });
      if (!input) return error(422, 'invalid', 'Some fields are missing or invalid.');
      if (body.version !== current.version) return error(409, 'conflict', 'Someone else changed this account.', current);
      const { arrMinor, ...rest } = input;
      const next = bump({ ...current, ...rest, arr: { minor: arrMinor, currency: current.arr.currency } });
      partition.accounts[index] = next;
      return HttpResponse.json(next);
    }),
  ),
];

export const handlers = [
  ...workspaceHandlers,
  // The session: not workspace data, so outside the tenant routes.
  http.get('*/api/session', async () => (await settle()) ?? HttpResponse.json(currentSession())),
];
