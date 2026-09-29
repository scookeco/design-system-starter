/**
 * The mock billing: three plans priced in the workspace's currency, the current period's usage
 * (seats and records counted from the workspace itself), and six months of invoices. Changing plan
 * is versioned, refused when what's in use doesn't fit (the same rule as the dialog), and audited.
 */
import { http, HttpResponse } from 'msw';
import type { Billing, Plan } from '../api/billing';
import type { Tenant } from '../api/schemas';
import { overLimits, planMisfit } from '../model/billingRules';
import { WORKSPACES } from '../workspaces';
import { auditWorkspace, memberCount } from './b2b';
import { db } from './db';
import { error, handle } from './route';

const API = '*/api/t/:tenant';
const GB = 1_000_000_000;

export const plansFor = (tenant: Tenant): Plan[] => {
  const currency = WORKSPACES[tenant].currency;
  return [
    { id: 'starter', name: 'Starter', price: { minor: 2_900, currency }, limits: { seats: 5, records: 500, storage: 10 * GB, apiCalls: 10_000 }, description: 'For a small team getting started.' },
    { id: 'team', name: 'Team', price: { minor: 9_900, currency }, limits: { seats: 50, records: 5_000, storage: 100 * GB, apiCalls: 100_000 }, description: 'Approvals, the audit log and integrations.' },
    { id: 'business', name: 'Business', price: { minor: 29_900, currency }, limits: { seats: 200, records: 50_000, storage: 1_000 * GB, apiCalls: 1_000_000 }, description: 'Single sign-on, data residency and priority support.' },
  ];
};

interface BillingState {
  planId: string;
  version: number;
}

const states = new WeakMap<object, BillingState>();

const billingState = (tenant: Tenant): BillingState => {
  const partition = db(tenant);
  let found = states.get(partition);
  if (!found) {
    found = { planId: 'team', version: 1 };
    states.set(partition, found);
  }
  return found;
};

/** The billing as the server answers it: usage counted now, invoices for the last six months. */
const billingOf = (tenant: Tenant): Billing => {
  const s = billingState(tenant);
  const plan = plansFor(tenant).find((p) => p.id === s.planId) ?? plansFor(tenant)[1];
  const price = plan?.price ?? { minor: 0, currency: WORKSPACES[tenant].currency };
  const months = ['2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04'];
  return {
    planId: s.planId,
    period: { start: '2026-09-01', end: '2026-09-30' },
    usage: {
      seats: memberCount(tenant),
      records: db(tenant).records.length,
      storage: tenant === 'acme' ? 18 * GB : 4 * GB,
      apiCalls: tenant === 'acme' ? 84_200 : 12_400,
    },
    invoices: months.map((month, i) => ({
      id: `${tenant}-inv-${month}`,
      number: `INV-${month.replace('-', '')}-${tenant === 'acme' ? '0417' : '0923'}`,
      issuedOn: `${month}-01`,
      amount: price,
      status: i === 0 ? 'open' : 'paid',
    })),
    version: s.version,
  };
};

export const billingHandlers = [
  http.get(
    `${API}/billing`,
    handle('workspace:read', ({ tenant }) => HttpResponse.json(billingOf(tenant))),
  ),

  http.get(
    `${API}/billing/plans`,
    handle('workspace:read', ({ tenant }) => HttpResponse.json({ items: plansFor(tenant) })),
  ),

  http.post(
    `${API}/billing/plan`,
    handle('workspace:manage', async ({ tenant, request }) => {
      const body = (await request.json()) as { planId?: string };
      const plan = plansFor(tenant).find((p) => p.id === body.planId);
      if (!plan) return error(422, 'invalid', 'Choose a plan.');
      const s = billingState(tenant);
      const version = Number(/^"(\d+)"$/.exec(request.headers.get('If-Match') ?? '')?.[1] ?? Number.NaN);
      if (Number.isNaN(version)) return error(428, 'precondition_required', 'This write needs an If-Match header with the version it was based on.');
      if (version !== s.version) return error(409, 'conflict', 'Someone else changed the plan since you opened this. Check it and try again.');
      if (plan.id === s.planId) return error(409, 'same_plan', `You’re already on ${plan.name}.`);
      const usage = billingOf(tenant).usage;
      if (overLimits(usage, plan).length > 0) return error(409, 'does_not_fit', planMisfit(usage, plan, (_metric, value) => String(value)) ?? 'This plan doesn’t fit what you use.');
      const before = plansFor(tenant).find((p) => p.id === s.planId)?.name ?? s.planId;
      s.planId = plan.id;
      s.version += 1;
      auditWorkspace(tenant, 'plan.changed', { type: 'workspace', id: tenant, label: WORKSPACES[tenant].name }, [{ field: 'plan', before, after: plan.name }]);
      return HttpResponse.json(billingOf(tenant));
    }),
  ),
];
