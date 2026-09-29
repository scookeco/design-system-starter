/**
 * The first-run checklist: which setup steps are done (the server works each one out from the
 * workspace itself, so it can't claim a step nobody did) and whether this person dismissed it.
 * Transport only.
 */
import { z } from 'zod';
import { request } from './client';
import type { Tenant } from './schemas';

export const ONBOARDING_STEPS = ['invite', 'import', 'connect'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const OnboardingSchema = z.object({
  steps: z.array(z.object({ id: z.enum(ONBOARDING_STEPS), done: z.boolean() })),
  /** This person hid the checklist. It stays hidden on every device, until they bring it back. */
  dismissed: z.boolean(),
});
export type Onboarding = z.infer<typeof OnboardingSchema>;

const base = (tenant: Tenant) => `/t/${tenant}/onboarding`;

export const getOnboarding = (tenant: Tenant, signal?: AbortSignal) => request(OnboardingSchema, base(tenant), { signal });
export const patchOnboarding = (tenant: Tenant, dismissed: boolean) => request(OnboardingSchema, base(tenant), { method: 'PATCH', body: { dismissed } });
