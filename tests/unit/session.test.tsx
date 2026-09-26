// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import type { Tenant } from '../../src/app/api/schemas';
import { currentSession, setRoles } from '../../src/app/mocks/db';
import { seedRecords } from '../../src/app/mocks/seed';
import { AppProviders } from '../../src/app/providers';
import { useAppSession } from '../../src/app/session';
import { createMemoryHistory } from '../../src/app/url/history';
import { ListPage } from '../../src/examples/ListPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, server, setupMockApi, testClient } from './app-harness';

afterEach(cleanup);
setupMockApi();

/** Exposes the session's actions to the test. */
let app: ReturnType<typeof useAppSession> | undefined;
function Handle() {
  app = useAppSession();
  return null;
}

const mount = (tenant: Tenant = 'acme', client = testClient()) => {
  const history = createMemoryHistory('/records');
  const ui = (session = currentSession()) => (
    <AppProviders session={session} tenant={tenant} queryClient={client} history={history} signedOut={<p>Signed out</p>}>
      <Handle />
      <ListPage />
    </AppProviders>
  );
  const view = render(ui());
  return { ...view, client, history, rerenderWith: (session: ReturnType<typeof currentSession>) => view.rerender(ui(session)) };
};

/** The list's "1–10 of N": waits for the first page to load. */
const pager = async () => within(await screen.findByRole('navigation', { name: 'Records pages' }, FIRST_PAINT)).getByRole('status');
/** The same, read now: for use inside waitFor. */
const pagerText = () => within(screen.getByRole('navigation', { name: 'Records pages' })).getByRole('status').textContent;
/** "1–10 of N" for a tenant's All tab, as an admin, from the seed. */
const firstPageOf = (tenant: Tenant) => `1–10 of ${String(seedRecords(tenant).filter((r) => r.status !== 'archived').length)}`;

describe('tenant boundary', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('switching workspace cancels the old one’s reads: a late answer never reaches the new screen', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const held: Request[] = [];
    let answered = 0;
    server.use(
      http.get('*/api/t/acme/records', async ({ request }) => {
        held.push(request);
        await gate;
        answered += 1;
        return HttpResponse.json({ items: seedRecords('acme').slice(0, 10), total: 999, page: 1, pageSize: 10 });
      }),
    );
    const { client } = mount('acme');
    const acmeQueries = () => client.getQueryCache().findAll({ queryKey: ['acme'] });
    // Switch only once acme's list is in flight and held, so the switch lands mid-request on every run.
    await waitFor(() => expect(held.length).toBeGreaterThan(0), FIRST_PAINT);
    act(() => app?.switchTenant('globex'));
    await waitFor(() => expect(pagerText()).toBe(firstPageOf('globex')), FIRST_PAINT);
    // The switch aborted the held reads, so their answers have nowhere to land.
    expect(held.every((request) => request.signal.aborted)).toBe(true);
    // Let them answer anyway. Once every handler has returned and no acme read is in flight, a late answer
    // has either landed or been dropped: nothing is left to race, however slow the machine.
    release();
    await waitFor(() => expect(answered).toBe(held.length));
    await waitFor(() => expect(acmeQueries().some((q) => q.state.fetchStatus === 'fetching')).toBe(false));
    // Still Globex, in EUR.
    expect(pagerText()).toBe(firstPageOf('globex'));
    expect(screen.getAllByText(/€/).length).toBeGreaterThan(0);
    expect(screen.queryByText(seedRecords('acme')[0]?.name ?? '?')).toBeNull();
    // Globex's data lives only under globex keys, and the late acme answer (total 999) reached no key at all.
    expect(client.getQueryCache().findAll({ queryKey: ['globex'] }).length).toBeGreaterThan(0);
    expect(acmeQueries().some((q) => (q.state.data as { total?: number } | undefined)?.total === 999)).toBe(false);
  });

  it('the account menu switches workspace and the brand follows', async () => {
    mount('acme');
    await pager();
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Sam Rivera' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Switch to Globex' }));
    await waitFor(() => expect(pagerText()).toBe(firstPageOf('globex')), FIRST_PAINT);
    expect(screen.getAllByText('Globex').length).toBeGreaterThan(0);
    expect(screen.queryByText('Acme')).toBeNull();
  });
});

describe('permission scope boundary', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('a narrower role never reads what a broader one cached, and the broader partition is dropped', async () => {
    const { client, rerenderWith } = mount('acme');
    expect((await pager()).textContent).toBe(firstPageOf('acme'));
    expect(client.getQueryCache().findAll({ queryKey: ['acme', 'admin'] }).length).toBeGreaterThan(0);

    // The role changes to viewer (the server says so; the session follows).
    setRoles('viewer');
    // Hold the viewer's list so that, if anything showed rows now, it could only be the admin's cached data.
    server.use(http.get('*/api/t/acme/records', () => new Promise<Response>(() => undefined)));
    rerenderWith(currentSession());

    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['acme', 'admin'] })).toHaveLength(0));
    expect(screen.queryByRole('navigation', { name: 'Records pages' })).toBeNull();
    expect(screen.getByText('Loading records…')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /^Drafts/ })).toBeNull();
  });
});

describe('session boundary', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('sign-out cancels everything, empties the query and mutation caches, and ends the server session', async () => {
    const { client } = mount('acme');
    await pager();
    expect(client.getQueryCache().getAll().length).toBeGreaterThan(0);
    await act(async () => {
      await app?.signOut();
    });
    expect(screen.getByText('Signed out')).toBeTruthy();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    const { getSession } = await import('../../src/app/api/session');
    await expect(getSession()).rejects.toMatchObject({ status: 401 });
  });
});
