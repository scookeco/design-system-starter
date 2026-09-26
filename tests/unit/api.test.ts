// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ContractError, reporting } from '../../src/app/api/client';
import { getAccount, listAccounts, patchAccount, postAccount } from '../../src/app/api/accounts';
import { countRecords, getRecord, listRecords, patchRecordName, postBulkDelete, postRecord } from '../../src/app/api/records';
import type { RecordQuery } from '../../src/app/api/schemas';
import { configureMocks } from '../../src/app/mocks/config';
import { resetDb } from '../../src/app/mocks/db';
import { handlers } from '../../src/app/mocks/handlers';
import { seedAccounts, seedPeople, seedRecords } from '../../src/app/mocks/seed';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  resetDb();
  configureMocks({ latencyMs: 0, failureRate: 0, random: Math.random });
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const query = (over: Partial<RecordQuery> = {}): RecordQuery => ({ q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 25, ...over });

describe('seed data', () => {
  it('is deterministic and a few hundred records across two tenants', () => {
    expect(seedRecords('acme')).toEqual(seedRecords('acme'));
    expect(seedRecords('acme').length + seedRecords('globex').length).toBeGreaterThanOrEqual(300);
    expect(new Set(seedRecords('acme').map((r) => r.id)).size).toBe(240);
  });
});

describe('entities joined by id', () => {
  it('every record points at a person and an account that exist, by id', () => {
    for (const tenant of ['acme', 'globex'] as const) {
      const people = new Set(seedPeople(tenant).map((p) => p.id));
      const accounts = new Set(seedAccounts(tenant).map((a) => a.id));
      for (const record of seedRecords(tenant)) {
        expect(people.has(record.ownerId)).toBe(true);
        expect(record.accountId !== null && accounts.has(record.accountId)).toBe(true);
      }
    }
    expect(seedAccounts('acme')).toEqual(seedAccounts('acme'));
  });

  it('serves accounts per tenant, creates once per key and refuses a stale edit', async () => {
    const { items } = await listAccounts('acme');
    expect(items.map((a) => a.id)).toEqual(seedAccounts('acme').map((a) => a.id));
    expect(items.every((a) => a.arr.currency === 'USD')).toBe(true);
    await expect(getAccount('globex', items[0]?.id ?? '')).rejects.toMatchObject({ status: 404 });

    const input = { name: 'Relecloud', domain: 'relecloud.example', industry: 'Software', ownerId: 'acme-p02', arrMinor: 5_000_000, customerSince: '2026-09-01' };
    const created = await postAccount('acme', input, 'acct-1');
    expect((await postAccount('acme', input, 'acct-1')).id).toBe(created.id);

    const renamed = await patchAccount('acme', created.id, { name: 'Relecloud Inc.' }, created.version);
    expect(renamed).toMatchObject({ name: 'Relecloud Inc.', version: created.version + 1, domain: 'relecloud.example' });
    await expect(patchAccount('acme', created.id, { name: 'Stale' }, created.version)).rejects.toMatchObject({ status: 409, current: { name: 'Relecloud Inc.' } });
    await expect(postAccount('acme', { ...input, ownerId: 'nobody' }, 'acct-2')).rejects.toMatchObject({ status: 422 });
  });
});

describe('mock API', () => {
  it('searches, filters, sorts and pages on the server, with the total of every match', async () => {
    const page = await listRecords('acme', query({ status: ['active'], sort: '-amount', pageSize: 10 }));
    expect(page.items).toHaveLength(10);
    expect(page.items.every((r) => r.status === 'active')).toBe(true);
    const amounts = page.items.map((r) => r.amount.minor);
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
    expect(page.total).toBe(seedRecords('acme').filter((r) => r.status === 'active').length);

    const searched = await listRecords('acme', query({ q: 'LEASE' }));
    expect(searched.items.every((r) => r.name.toLowerCase().includes('lease'))).toBe(true);
    // The server joins the owner's name by id before searching: "priya" finds Priya Natarajan's records.
    const priya = seedPeople('acme').find((p) => p.name.startsWith('Priya'));
    const byOwner = await listRecords('acme', query({ q: 'priya', pageSize: 100 }));
    expect(byOwner.total).toBe(seedRecords('acme').filter((r) => r.ownerId === priya?.id).length);
    expect(byOwner.items.every((r) => r.ownerId === priya?.id)).toBe(true);
  });

  it('keeps tenants apart', async () => {
    const acme = await listRecords('acme', query());
    const globex = await listRecords('globex', query());
    expect(acme.items[0]?.amount.currency).toBe('USD');
    expect(globex.items[0]?.amount.currency).toBe('EUR');
    await expect(getRecord('globex', acme.items[0]?.id ?? '')).rejects.toMatchObject({ status: 404 });
  });

  it('counts each view with the same predicates the list filters by', async () => {
    const { counts } = await countRecords('acme', { q: '', status: [] });
    const all = seedRecords('acme');
    expect(counts.archived).toBe(all.filter((r) => r.status === 'archived').length);
    expect(counts.all).toBe(all.length - counts.archived);
  });

  it('answers a stale rename with a 409 carrying the current record', async () => {
    const record = (await listRecords('acme', query())).items[0];
    if (!record) throw new Error('no record');
    const renamed = await patchRecordName('acme', record.id, 'Renamed', record.version);
    expect(renamed.version).toBe(record.version + 1);
    const conflict = await patchRecordName('acme', record.id, 'Again', record.version).catch((e: unknown) => e);
    expect(conflict).toBeInstanceOf(ApiError);
    expect(conflict).toMatchObject({ status: 409, code: 'conflict', current: { name: 'Renamed' } });
  });

  it('creates once per idempotency key', async () => {
    const draft = { name: 'Pilot hosting order', ownerId: 'acme-p01', amountMinor: 120_000, renewsOn: '2027-01-31', tags: [] };
    const first = await postRecord('acme', draft, 'key-1');
    const replay = await postRecord('acme', draft, 'key-1');
    expect(replay.id).toBe(first.id);
    expect((await listRecords('acme', query({ q: 'Pilot hosting order' }))).total).toBe(1);
  });

  it('deletes by filter and reports the records it could not delete', async () => {
    const onHold = seedRecords('acme').filter((r) => r.status === 'draft' && r.tags.includes('legal-hold'));
    const drafts = seedRecords('acme').filter((r) => r.status === 'draft');
    const result = await postBulkDelete('acme', { filter: { q: '', status: [], view: 'drafts' } });
    expect(result.deleted).toHaveLength(drafts.length - onHold.length);
    expect(result.failed.map((f) => f.id)).toEqual(onHold.map((r) => r.id));
  });

  it('fails for real at the configured rate', async () => {
    configureMocks({ failureRate: 1 });
    await expect(listRecords('acme', query())).rejects.toMatchObject({ name: 'ApiError', status: 500, code: 'server_error' });
  });
});

describe('boundary validation', () => {
  it('rejects a payload that breaks the contract, reports it, and keeps it out of the cache', async () => {
    const report = vi.spyOn(reporting, 'report').mockImplementation(() => undefined);
    server.use(http.get('*/api/t/:tenant/records', () => HttpResponse.json({ items: [{ id: 'r-1', name: 42 }], total: 'lots' })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = ['acme', 'records', query()];
    await expect(client.fetchQuery({ queryKey: key, queryFn: ({ signal }) => listRecords('acme', query(), signal) })).rejects.toBeInstanceOf(ContractError);
    expect(report).toHaveBeenCalledOnce();
    expect(client.getQueryData(key)).toBeUndefined();
    expect(client.getQueryState(key)?.status).toBe('error');
  });

  it('turns an error body into an ApiError with its code', async () => {
    server.use(http.get('*/api/t/:tenant/records/:id', () => HttpResponse.json({ error: { code: 'not_found', message: 'Gone.' } }, { status: 404 })));
    await expect(getRecord('acme', 'r-x')).rejects.toMatchObject({ status: 404, code: 'not_found', message: 'Gone.' });
  });
});
