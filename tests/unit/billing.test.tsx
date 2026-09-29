// @vitest-environment jsdom
/**
 * Billing and usage: the fit rule (shared by the dialog and the server), the mock API (versioned,
 * refused when the plan can't hold what's in use, audited) and the page's change-plan dialog.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { listAudit } from '../../src/app/api/admin';
import { getBilling, listPlans, postChangePlan } from '../../src/app/api/billing';
import { setRoles } from '../../src/app/mocks/db';
import { overLimits, planMisfit } from '../../src/app/model/billingRules';
import { BillingPage } from '../../src/examples/BillingPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

describe('which plans fit', () => {
  it('lists every limit a plan is under, and says the first in words', () => {
    const usage = { seats: 10, records: 240, storage: 18, apiCalls: 84 };
    const small = { name: 'Starter', limits: { seats: 5, records: 500, storage: 10, apiCalls: 100 } };
    expect(overLimits(usage, small)).toEqual(['seats', 'storage']);
    expect(planMisfit(usage, small, (_m, v) => String(v))).toBe('You use 10; Starter allows 5. 1 more limit is over too.');
    expect(planMisfit(usage, { ...small, limits: { seats: 50, records: 500, storage: 100, apiCalls: 100 } }, (_m, v) => String(v))).toBeUndefined();
  });
});

describe('the mock billing API', () => {
  it('prices plans in the workspace’s currency and counts usage from the workspace', async () => {
    const billing = await getBilling('acme');
    expect(billing).toMatchObject({ planId: 'team', usage: { seats: 10, records: 240 }, period: { start: '2026-09-01', end: '2026-09-30' } });
    expect(billing.invoices.map((i) => i.status)).toEqual(['open', 'paid', 'paid', 'paid', 'paid', 'paid']);
    expect((await listPlans('globex')).items[0]?.price).toEqual({ minor: 2_900, currency: 'EUR' });
  });

  it('changes plan on the version it was read at, refuses what doesn’t fit, and audits the change', async () => {
    const billing = await getBilling('acme');
    await expect(postChangePlan('acme', 'starter', billing.version)).rejects.toMatchObject({ status: 409, code: 'does_not_fit' });
    const after = await postChangePlan('acme', 'business', billing.version);
    expect(after).toMatchObject({ planId: 'business', version: billing.version + 1 });
    await expect(postChangePlan('acme', 'team', billing.version)).rejects.toMatchObject({ status: 409, code: 'conflict' });
    const [latest] = (await listAudit('acme', { actor: '', actions: [], from: '', to: '', page: 1, pageSize: 1 })).items;
    expect(latest).toMatchObject({ action: 'plan.changed', changes: [{ field: 'plan', before: 'Team', after: 'Business' }] });
  });

  it('refuses a change from anyone who can’t manage the workspace', async () => {
    setRoles('editor');
    const billing = await getBilling('acme');
    await expect(postChangePlan('acme', 'business', billing.version)).rejects.toMatchObject({ status: 403 });
  });
});

describe('the billing page', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('shows usage in words, disables a plan that doesn’t fit with the reason, and switches plan', async () => {
    renderWithApp(<BillingPage />, { url: '/billing' });
    const api = await screen.findByRole('meter', { name: 'API calls' }, FIRST_PAINT);
    expect(api.getAttribute('aria-valuetext')).toMatch(/^84,200 calls of 100,000 calls/);
    expect(screen.getAllByRole('cell', { name: '$99.00' })).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Change plan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change plan' });
    const starter = within(dialog).getByRole('radio', { name: /^Starter/ });
    expect(starter.hasAttribute('disabled') || starter.getAttribute('aria-disabled') === 'true' || starter.getAttribute('data-disabled') !== null).toBe(true);
    expect(within(dialog).getByText(/You use 10 seats; Starter allows 5 seats\./)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('radio', { name: /^Business/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Switch to Business' }));
    await screen.findByText('You’re on Business now');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText(/^Business plan\./)).toBeTruthy();
  });

  it('disables Change plan for an editor, with the reason', async () => {
    renderWithApp(<BillingPage />, { url: '/billing', role: 'editor' });
    const change = await screen.findByRole('button', { name: 'Change plan' }, FIRST_PAINT);
    expect(change.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Only workspace admins can set up the workspace.')).toBeTruthy();
  });
});
