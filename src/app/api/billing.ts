/**
 * Billing and usage: the workspace's plan, what it has used this period against the plan's limits,
 * its invoices, and the plans it could move to. Money is integer minor units with a currency code.
 * Transport only; which plan fits is a rule in src/app/model/billingRules.ts.
 */
import { z } from 'zod';
import { request } from './client';
import { MoneySchema, type Tenant } from './schemas';

export const USAGE_METRICS = ['seats', 'records', 'storage', 'apiCalls'] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

const LimitsSchema = z.object({ seats: z.number().int().positive(), records: z.number().int().positive(), storage: z.number().int().positive(), apiCalls: z.number().int().positive() });

export const PlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Per month, for the whole workspace. */
  price: MoneySchema,
  /** What the plan allows: seats, records, storage in bytes, API calls per month. */
  limits: LimitsSchema,
  description: z.string(),
});
export type Plan = z.infer<typeof PlanSchema>;
export const PlansSchema = z.object({ items: z.array(PlanSchema) });

export const InvoiceSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1),
  /** A calendar date. */
  issuedOn: z.iso.date(),
  amount: MoneySchema,
  status: z.enum(['paid', 'open', 'void']),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const BillingSchema = z.object({
  planId: z.string().min(1),
  /** The current period, as calendar dates; usage resets at its end. */
  period: z.object({ start: z.iso.date(), end: z.iso.date() }),
  /** What's in use now, in the limits' units. */
  usage: z.object({ seats: z.number().int().nonnegative(), records: z.number().int().nonnegative(), storage: z.number().int().nonnegative(), apiCalls: z.number().int().nonnegative() }),
  invoices: z.array(InvoiceSchema),
  version: z.number().int().nonnegative(),
});
export type Billing = z.infer<typeof BillingSchema>;
export type Usage = Billing['usage'];

const base = (tenant: Tenant) => `/t/${tenant}/billing`;

export const getBilling = (tenant: Tenant, signal?: AbortSignal) => request(BillingSchema, base(tenant), { signal });
export const listPlans = (tenant: Tenant, signal?: AbortSignal) => request(PlansSchema, `${base(tenant)}/plans`, { signal });
/** Change plan: versioned (If-Match), and refused (409) if what's in use doesn't fit the new plan. */
export const postChangePlan = (tenant: Tenant, planId: string, version: number) => request(BillingSchema, `${base(tenant)}/plan`, { method: 'POST', body: { planId }, ifMatch: version });
