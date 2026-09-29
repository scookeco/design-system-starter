// @vitest-environment jsdom
/**
 * Integrations: the mock API (admins only, versioned settings, audited) and the catalogue page's
 * pessimistic connect, settings drawer and confirmed disconnect.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { listAudit } from '../../src/app/api/admin';
import { listIntegrations, patchIntegrationSettings, postConnect, postDisconnect } from '../../src/app/api/integrations';
import { setRoles } from '../../src/app/mocks/db';
import { IntegrationsPage } from '../../src/examples/IntegrationsPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

const everything = { actor: '', actions: [], from: '', to: '', page: 1, pageSize: 5 } as const;

describe('the mock integrations API', () => {
  it('connects with default settings, refuses twice, disconnects and drops the settings, and audits each', async () => {
    const connected = await postConnect('acme', 'almanac');
    expect(connected).toMatchObject({ status: 'connected', connectedBy: 'acme-p01', settings: { frequency: 'hourly', direction: 'one-way' } });
    await expect(postConnect('acme', 'almanac')).rejects.toMatchObject({ status: 409 });
    expect(await postDisconnect('acme', 'almanac')).toMatchObject({ status: 'available', settings: null, connectedBy: null });
    const log = await listAudit('acme', everything);
    expect(log.items.slice(0, 2).map((e) => e.action)).toEqual(['integration.disconnected', 'integration.connected']);
  });

  it('saves settings on the version they were read at, and refuses a stale one', async () => {
    const relay = (await listIntegrations('acme')).items.find((i) => i.id === 'relay');
    if (!relay) throw new Error('no relay');
    const saved = await patchIntegrationSettings('acme', 'relay', { frequency: 'daily', direction: 'two-way' }, relay.version);
    expect(saved).toMatchObject({ settings: { frequency: 'daily', direction: 'two-way' }, version: relay.version + 1 });
    await expect(patchIntegrationSettings('acme', 'relay', { frequency: 'hourly', direction: 'one-way' }, relay.version)).rejects.toMatchObject({ status: 409 });
    expect((await listAudit('acme', everything)).items[0]).toMatchObject({ action: 'integration.updated', changes: [{ field: 'frequency', before: 'realtime', after: 'daily' }, { field: 'direction', before: 'one-way', after: 'two-way' }] });
  });

  it('lets everyone see the catalogue and only admins change it', async () => {
    setRoles('editor');
    expect((await listIntegrations('acme')).items).toHaveLength(6);
    await expect(postConnect('acme', 'almanac')).rejects.toMatchObject({ status: 403 });
  });
});

describe('the integrations page', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('connects pessimistically, opens settings from the URL, saves, and disconnects after confirming', async () => {
    const { history } = renderWithApp(<IntegrationsPage />, { url: '/integrations' });
    fireEvent.click(await screen.findByRole('button', { name: 'Connect Almanac' }, FIRST_PAINT));
    const connected = await screen.findByRole('region', { name: 'Connected (2)' });
    expect(within(connected).getByRole('heading', { level: 3, name: 'Almanac' })).toBeTruthy();
    fireEvent.click(within(connected).getByRole('button', { name: 'Almanac settings' }));
    expect(history.location().search).toBe('?app=almanac');
    const drawer = await screen.findByRole('dialog', { name: 'Almanac settings' });
    fireEvent.click(within(drawer).getByRole('radio', { name: /Once a day/ }));
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Almanac settings saved');
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Almanac settings' })).getByRole('button', { name: 'Disconnect' }));
    const confirm = await screen.findByRole('dialog', { name: 'Disconnect Almanac?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Disconnect Almanac' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByRole('button', { name: 'Connect Almanac' })).toBeTruthy();
    expect(history.location().search).toBe('');
  });

  it('disables Connect for an editor, pointing at the reason', async () => {
    renderWithApp(<IntegrationsPage />, { url: '/integrations', role: 'editor' });
    const connect = await screen.findByRole('button', { name: 'Connect Almanac' }, FIRST_PAINT);
    expect(connect.hasAttribute('disabled')).toBe(true);
    expect(document.getElementById(connect.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Only workspace admins can set up the workspace.');
  });
});
