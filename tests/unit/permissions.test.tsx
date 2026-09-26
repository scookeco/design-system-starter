// @vitest-environment jsdom
import { cleanup, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { listRecords, postArchive, postRecord } from '../../src/app/api/records';
import { CAPABILITIES, ROLES, type RecordEntity } from '../../src/app/api/schemas';
import { currentSession, setRoles } from '../../src/app/mocks/db';
import { seedRecords } from '../../src/app/mocks/seed';
import { isForbidden, useArchiveRecord, useCreateRecord } from '../../src/app/model/mutations';
import { can, canSee, DENIAL_REASONS, ROLE_CAPABILITIES } from '../../src/app/model/permissions';
import { ListPage } from '../../src/examples/ListPage';
import { Guard } from '../../src/examples/Permission';
import { RecordPage } from '../../src/examples/RecordPage';
import { renderWithApp, server, setupMockApi, testClient, wrapperFor } from './app-harness';

afterEach(cleanup);
setupMockApi();

const records = seedRecords('acme');
const archived = records.find((r) => r.status === 'archived') as RecordEntity;
const onHold = records.find((r) => r.tags.includes('legal-hold')) as RecordEntity;
const grant = (role: (typeof ROLES)[number]) => ({ capabilities: ROLE_CAPABILITIES[role] });

/** Count the requests that reach the mock server, by method and path. */
const countRequests = () => {
  const seen: string[] = [];
  const listener = ({ request }: { request: Request }) => seen.push(`${request.method} ${new URL(request.url).pathname}`);
  server.events.on('request:start', listener);
  return { seen, stop: () => server.events.removeListener('request:start', listener) };
};

describe('the one mapping and the one predicate', () => {
  it('maps roles to capabilities as a ladder: each role holds everything the one below it does', () => {
    for (let i = 1; i < ROLES.length; i += 1) {
      const lower = ROLE_CAPABILITIES[ROLES[i - 1] as (typeof ROLES)[number]];
      const higher = ROLE_CAPABILITIES[ROLES[i] as (typeof ROLES)[number]];
      expect(lower.every((c) => higher.includes(c))).toBe(true);
      expect(higher.length).toBeGreaterThan(lower.length);
    }
    expect([...ROLE_CAPABILITIES.admin].sort()).toEqual([...CAPABILITIES].sort());
    // Every capability has a reason a person can act on.
    expect(Object.keys(DENIAL_REASONS).sort()).toEqual([...CAPABILITIES].sort());
  });

  it('checks the capability, then the object rule for the thing acted on', () => {
    expect(can(grant('viewer'), 'record:rename')).toBe(false);
    expect(can(grant('editor'), 'record:rename')).toBe(true);
    expect(can(grant('editor'), 'record:rename', archived)).toBe(false);
    expect(can(grant('editor'), 'record:delete')).toBe(false);
    expect(can(grant('admin'), 'record:delete')).toBe(true);
    expect(can(grant('admin'), 'record:delete', onHold)).toBe(false);
    expect(can({ capabilities: [] }, 'record:read')).toBe(false);
  });

  it('shapes what a role sees: viewers get the same records minus drafts', () => {
    const draft = records.find((r) => r.status === 'draft') as RecordEntity;
    expect(canSee(grant('viewer'), draft)).toBe(false);
    expect(canSee(grant('editor'), draft)).toBe(true);
  });

  it('ships capabilities with the session; the client never derives them from the role', () => {
    setRoles({ acme: 'viewer', globex: 'admin' });
    const session = currentSession();
    expect(session.memberships.find((m) => m.tenant === 'acme')?.capabilities).toEqual([...ROLE_CAPABILITIES.viewer]);
    expect(session.memberships.find((m) => m.tenant === 'globex')?.capabilities).toEqual([...ROLE_CAPABILITIES.admin]);
  });
});

describe('the server enforces too', () => {
  it('answers 403 when a client skips its own check', async () => {
    setRoles('viewer');
    await expect(postRecord('acme', { name: 'Sneaky' }, 'key-1')).rejects.toMatchObject({ status: 403, code: 'forbidden' });
    await expect(postArchive('acme', records[0]?.id ?? '')).rejects.toMatchObject({ status: 403 });
    setRoles('editor');
    await expect(postArchive('acme', records.find((r) => r.status === 'active')?.id ?? '')).resolves.toMatchObject({ status: 'archived' });
  });

  it('filters in the query: a viewer’s pages and totals never include drafts', async () => {
    setRoles('viewer');
    const page = await listRecords('acme', { q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 100 });
    expect(page.total).toBe(records.filter((r) => r.status !== 'archived' && r.status !== 'draft').length);
    expect(page.items.some((r) => r.status === 'draft')).toBe(false);
  });
});

describe('mutations refuse before sending', () => {
  it('a viewer’s create never reaches the server, and says why', async () => {
    setRoles('viewer');
    const requests = countRequests();
    const { result } = renderHook(() => useCreateRecord(), { wrapper: wrapperFor(testClient()) });
    const error = await result.current.mutateAsync({ record: { name: 'Nope' }, idempotencyKey: 'k' }).catch((e: unknown) => e);
    requests.stop();
    expect(isForbidden(error)).toBe(true);
    expect((error as Error).message).toBe(DENIAL_REASONS['record:create']);
    expect(requests.seen.filter((r) => r.startsWith('POST'))).toEqual([]);
  });

  it('an editor’s archive goes through; the same hook for a viewer does not', async () => {
    const target = records.find((r) => r.status === 'active') as RecordEntity;
    setRoles('viewer');
    const requests = countRequests();
    const viewer = renderHook(() => useArchiveRecord(target.id), { wrapper: wrapperFor(testClient()) });
    await expect(viewer.result.current.mutateAsync()).rejects.toMatchObject({ status: 403 });
    expect(requests.seen.filter((r) => r.startsWith('POST'))).toEqual([]);
    requests.stop();
    setRoles('editor');
    const editor = renderHook(() => useArchiveRecord(target.id), { wrapper: wrapperFor(testClient()) });
    await expect(editor.result.current.mutateAsync()).resolves.toMatchObject({ status: 'archived' });
  });
});

describe('the UI asks the same predicate', () => {
  it('list page, viewer: no Drafts tab, New record disabled with the reason beside it', async () => {
    renderWithApp(<ListPage />, { role: 'viewer' });
    const views = screen.getByRole('navigation', { name: 'Record views' });
    await waitFor(() => expect(within(views).getByRole('link', { name: /^All \(/ })).toBeTruthy());
    expect(within(views).queryByRole('link', { name: /^Drafts/ })).toBeNull();
    const create = screen.getByRole('button', { name: 'New record' });
    expect((create as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById(create.getAttribute('aria-describedby') ?? '')?.textContent).toBe(DENIAL_REASONS['record:create']);
  });

  it('record page: the More menu shows only what the role holds', async () => {
    renderWithApp(<RecordPage recordId="r-1001" initialMenuOpen />, { role: 'viewer' });
    await screen.findByRole('menuitem', { name: 'Export as CSV' });
    expect(screen.queryByRole('menuitem', { name: 'Rename' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Delete record' })).toBeNull();
    cleanup();
    renderWithApp(<RecordPage recordId="r-1001" initialMenuOpen />, { role: 'editor' });
    await screen.findByRole('menuitem', { name: 'Rename' });
    expect(screen.queryByRole('menuitem', { name: 'Delete record' })).toBeNull();
  });

  it('the route guard renders the 403 page in place of a page the role can’t open', () => {
    renderWithApp(
      <Guard capability="record:create" current="/records">
        <p>The create page</p>
      </Guard>,
      { role: 'viewer' },
    );
    expect(screen.getByRole('heading', { level: 1, name: 'You don’t have access to this page' })).toBeTruthy();
    expect(screen.queryByText('The create page')).toBeNull();
  });

  it('a 403 that arrives anyway rolls the rename back and says why', async () => {
    const { http, HttpResponse } = await import('msw');
    server.use(http.patch('*/api/t/:tenant/records/:id', () => HttpResponse.json({ error: { code: 'forbidden', message: 'Your role changed.' } }, { status: 403 })));
    renderWithApp(<RecordPage recordId="r-1001" initialAction={{ kind: 'rename', name: 'Forbidden name' }} />);
    expect(await screen.findByText('You can’t rename this record')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(records[0]?.name));
  });
});
