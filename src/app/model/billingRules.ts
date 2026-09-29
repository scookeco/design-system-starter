/**
 * Which plans fit a workspace: the one rule the change-plan dialog (to disable an option, with the
 * reason) and the mock server (to refuse, 409) both read.
 */
import type { Plan, Usage, UsageMetric } from '../api/billing';

export const METRIC_LABEL: Record<UsageMetric, { name: string; unit: (n: string) => string }> = {
  seats: { name: 'Seats', unit: (n) => `${n} seats` },
  records: { name: 'Records', unit: (n) => `${n} records` },
  storage: { name: 'Storage', unit: (n) => n },
  apiCalls: { name: 'API calls', unit: (n) => `${n} calls` },
};

/** What's in use that a plan doesn't allow: every metric over its limit, empty when it fits. */
export const overLimits = (usage: Usage, plan: Pick<Plan, 'limits'>): UsageMetric[] =>
  (['seats', 'records', 'storage', 'apiCalls'] as const).filter((metric) => usage[metric] > plan.limits[metric]);

/** Why a plan doesn't fit, in words, or undefined when it does. `amount` formats a metric's value. */
export const planMisfit = (usage: Usage, plan: Pick<Plan, 'name' | 'limits'>, amount: (metric: UsageMetric, value: number) => string) => {
  const over = overLimits(usage, plan);
  const first = over[0];
  if (!first) return undefined;
  return `You use ${amount(first, usage[first])}; ${plan.name} allows ${amount(first, plan.limits[first])}.${over.length > 1 ? ` ${String(over.length - 1)} more ${over.length === 2 ? 'limit is' : 'limits are'} over too.` : ''}`;
};
