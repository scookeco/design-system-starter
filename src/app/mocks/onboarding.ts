/**
 * The mock first-run checklist. Each step is worked out from the workspace, never stored: a second
 * member or an invitation (invite), an import that brought records in (import), a connected app
 * (connect). Only "dismissed" is stored, per workspace, reset with the database.
 */
import { http, HttpResponse } from 'msw';
import type { Onboarding } from '../api/onboarding';
import type { Tenant } from '../api/schemas';
import { memberCount } from './b2b';
import { db } from './db';
import { integrationState } from './integrations';
import { error, handle } from './route';

const API = '*/api/t/:tenant';
const dismissed = new WeakMap<object, boolean>();

const onboardingOf = (tenant: Tenant): Onboarding => ({
  steps: [
    { id: 'invite', done: memberCount(tenant) > 1 },
    { id: 'import', done: db(tenant).jobs.some((j) => j.kind === 'import' && j.done > j.failed.length && !j.paused) },
    { id: 'connect', done: integrationState(tenant).items.some((i) => i.status === 'connected') },
  ],
  dismissed: dismissed.get(db(tenant)) ?? false,
});

export const onboardingHandlers = [
  http.get(
    `${API}/onboarding`,
    handle('workspace:manage', ({ tenant }) => HttpResponse.json(onboardingOf(tenant))),
  ),

  http.patch(
    `${API}/onboarding`,
    handle('workspace:manage', async ({ tenant, request }) => {
      const body = (await request.json()) as { dismissed?: unknown };
      if (typeof body.dismissed !== 'boolean') return error(422, 'invalid', 'Say whether to hide the checklist.');
      dismissed.set(db(tenant), body.dismissed);
      return HttpResponse.json(onboardingOf(tenant));
    }),
  ),
];
