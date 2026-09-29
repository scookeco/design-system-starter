// @vitest-environment jsdom
/**
 * The seam a portal uses to reach its real backend: one base URL (configureApi in
 * src/app/api/client.ts). Proved against a real HTTP server in this process, standing in for a
 * backend: the records list moves to it, parsed by the same zod schema, while every other resource
 * stays on the mock API. That's how a portal replaces the mocks: one resource at a time.
 */
import { cleanup, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import { http, passthrough } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { apiUrl, configureApi, ContractError } from '../../src/app/api/client';
import { listRecords } from '../../src/app/api/records';
import type { RecordEntity } from '../../src/app/api/schemas';
import { seedRecords } from '../../src/app/mocks/seed';
import { ListPage } from '../../src/examples/ListPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, server, setupMockApi } from './app-harness';

setupMockApi();
afterEach(cleanup);

/** What the backend holds: two records, renamed so the page can only have them from here. */
const BACKEND_RECORDS: RecordEntity[] = seedRecords('acme')
  .filter((r) => r.status === 'active')
  .slice(0, 2)
  .map((r, i) => ({ ...r, name: i === 0 ? 'Lease from the backend' : 'Another lease from the backend' }));

let backend: Server;
let origin = '';
const requests: string[] = [];

beforeAll(async () => {
  backend = createServer((req, res) => {
    requests.push(`${req.method ?? ''} ${req.url ?? ''}`);
    const url = new URL(req.url ?? '/', 'http://backend');
    if (req.method === 'GET' && url.pathname === '/api/t/acme/records') {
      // A search for "broken" gets a payload that breaks the contract.
      const body = url.searchParams.get('q') === 'broken' ? { items: [{ id: 1 }], total: 'many' } : { items: BACKEND_RECORDS, total: 2, page: 1, pageSize: 25 };
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: { code: 'not_found', message: 'No such route.' } }));
    }
  });
  await new Promise<void>((done) => backend.listen(0, '127.0.0.1', done));
  const address = backend.address();
  origin = typeof address === 'object' && address ? `http://127.0.0.1:${String(address.port)}` : '';
});

afterEach(() => configureApi({ baseUrl: '/api' }));
afterAll(async () => {
  configureApi({ baseUrl: '/api' });
  await new Promise((done) => backend.close(done));
});

describe('the API base URL', () => {
  it('is /api on the page’s origin by default, and any base once configured', () => {
    expect(apiUrl('/t/acme/records')).toBe(new URL('/api/t/acme/records', globalThis.location.origin).toString());
    configureApi({ baseUrl: 'https://api.example.com/v1/' });
    expect(apiUrl('/t/acme/records?page=2')).toBe('https://api.example.com/v1/t/acme/records?page=2');
  });

  it('is the only place src/app/api spells the /api prefix', () => {
    const dir = resolve('src/app/api');
    const offenders = readdirSync(dir)
      .filter((f) => f !== 'client.ts' && f.endsWith('.ts'))
      .filter((f) => /['`"]\/api\//.test(readFileSync(resolve(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('one resource on a real backend, the rest on the mock API', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  // The backend serves /api like the mocks, so every other read still matches a mock route. The one
  // resource that moved is let through to the network; in the portal itself MSW isn't running at all.
  const moveRecordsList = () => {
    configureApi({ baseUrl: `${origin}/api` });
    server.use(http.get(`${origin}/api/t/:tenant/records`, () => passthrough()));
  };

  it('renders the records list the backend sent; the page’s other reads stay on the mocks', async () => {
    moveRecordsList();
    renderWithApp(<ListPage />, { url: '/records' });
    expect(await screen.findByRole('link', { name: 'Lease from the backend' }, FIRST_PAINT)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Another lease from the backend' })).toBeTruthy();
    expect(requests.filter((r) => r.startsWith('GET /api/t/acme/records?')).length).toBeGreaterThan(0);
    // Counts, views and the directories were answered by the mocks: the backend saw only the list.
    expect(requests.every((r) => r.startsWith('GET /api/t/acme/records?'))).toBe(true);
  });

  it('parses the backend’s answer with the same zod schema: a broken payload is a contract error, never data', async () => {
    moveRecordsList();
    const failure = await listRecords('acme', { q: 'broken', status: [], view: 'all', sort: 'name', page: 1, pageSize: 25 }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ContractError);
  });
});
