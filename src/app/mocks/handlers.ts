/**
 * The mock API: MSW request handlers over the in-memory database. It behaves like a real server:
 * search, filter, sort and paging happen here, `total` counts every match, writes bump a version,
 * a stale edit gets a 409, a replayed create returns the first result, and bulk deletes can
 * partly fail. Latency and failures come from mockConfig, and failures are real HTTP errors.
 *
 * The same handlers serve Storybook (msw/browser via msw-storybook-addon) and Vitest (msw/node).
 */
import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw';
import {
  RECORD_STATUSES,
  RECORD_VIEWS,
  RecordStatusSchema,
  RecordViewSchema,
  TenantSchema,
  type RecordEntity,
  type RecordFilter,
  type RecordStatus,
  type RecordView,
  type SortKey,
  type Tenant,
} from '../api/schemas';
import { canArchive, canDelete, canRename, matchesFilter } from '../model/predicates';
import { mockConfig } from './config';
import { db, touch } from './db';
import { SEED_EPOCH } from './seed';

const API = '*/api/t/:tenant';

const error = (status: number, code: string, message: string, current?: RecordEntity) =>
  HttpResponse.json({ error: { code, message, ...(current ? { current } : {}) } }, { status });

/** Latency, then the failure roll, then the handler. Every handler goes through this. */
const handle =
  (resolver: (args: { tenant: Tenant; request: Request; params: Record<string, string | readonly string[] | undefined> }) => Response | Promise<Response>): HttpResponseResolver =>
  async ({ request, params }) => {
    if (mockConfig.latencyMs > 0) await delay(mockConfig.latencyMs);
    if (mockConfig.failureRate > 0 && mockConfig.random() < mockConfig.failureRate) {
      return error(500, 'server_error', 'The server hit a problem. Try again.');
    }
    const tenant = TenantSchema.safeParse(params.tenant);
    if (!tenant.success) return error(404, 'unknown_tenant', 'No such workspace.');
    return resolver({ tenant: tenant.data, request, params });
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

export const handlers = [
  http.get(
    `${API}/records`,
    handle(({ tenant, request }) => {
      const url = new URL(request.url);
      const filter = parseFilter(url);
      const sort = url.searchParams.get('sort');
      const pageSize = clampInt(url.searchParams.get('pageSize'), 25, 1, 100);
      const matches = db(tenant)
        .records.filter((r) => matchesFilter(r, filter))
        .sort((a, b) => COMPARE[isSortKey(sort) ? sort : 'name'](a, b) || a.id.localeCompare(b.id));
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      const page = clampInt(url.searchParams.get('page'), 1, 1, pages);
      return HttpResponse.json({ items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize });
    }),
  ),

  http.get(
    `${API}/records/counts`,
    handle(({ tenant, request }) => {
      const { q, status } = parseFilter(new URL(request.url));
      const counts = Object.fromEntries(
        RECORD_VIEWS.map((view: RecordView) => [view, db(tenant).records.filter((r) => matchesFilter(r, { q, status, view })).length]),
      );
      return HttpResponse.json({ counts });
    }),
  ),

  http.get(
    `${API}/people`,
    handle(({ tenant }) => HttpResponse.json({ items: db(tenant).people })),
  ),

  http.get(
    `${API}/records/:id`,
    handle(({ tenant, params }) => {
      const record = db(tenant).records.find((r) => r.id === params.id);
      return record ? HttpResponse.json(record) : error(404, 'not_found', 'This record doesn’t exist, or was deleted.');
    }),
  ),

  http.post(
    `${API}/records`,
    handle(async ({ tenant, request }) => {
      const key = request.headers.get('Idempotency-Key');
      if (!key) return error(400, 'idempotency_key_required', 'Creates need an Idempotency-Key header.');
      const partition = db(tenant);
      const replay = partition.created.get(key);
      if (replay) return HttpResponse.json(replay, { status: 201 });

      const body = (await request.json()) as Partial<{ name: string; ownerId: string; amountMinor: number; renewsOn: string; tags: string[] }>;
      const owner = partition.people.find((p) => p.id === body.ownerId);
      if (!body.name?.trim() || !owner || typeof body.amountMinor !== 'number' || !body.renewsOn) {
        return error(422, 'invalid', 'Some fields are missing or invalid.');
      }
      const currency = partition.records[0]?.amount.currency ?? 'USD';
      const record = touch({
        id: `${tenant === 'acme' ? 'r' : 'g'}-${String(partition.nextId)}`,
        name: body.name.trim(),
        owner,
        status: 'draft',
        amount: { minor: Math.round(body.amountMinor), currency },
        updatedAt: new Date(SEED_EPOCH).toISOString(),
        renewsOn: body.renewsOn,
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
    handle(async ({ tenant, request, params }) => {
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
    handle(({ tenant, params }) => {
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
    `${API}/records/bulk-delete`,
    handle(async ({ tenant, request }) => {
      const partition = db(tenant);
      const body = (await request.json()) as { ids?: string[]; filter?: Partial<RecordFilter> };
      const filter: RecordFilter | undefined = body.filter
        ? {
            q: body.filter.q ?? '',
            status: (body.filter.status ?? []).filter((s): s is RecordStatus => (RECORD_STATUSES as readonly string[]).includes(s)),
            view: RecordViewSchema.catch('all').parse(body.filter.view),
          }
        : undefined;
      const targets = filter ? partition.records.filter((r) => matchesFilter(r, filter)) : partition.records.filter((r) => body.ids?.includes(r.id));
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
];
