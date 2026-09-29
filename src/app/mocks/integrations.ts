/**
 * The mock integrations catalogue: fictional apps, one connected in Acme and none in Globex, per
 * tenant, hanging off the database partition (reset with it). Writes need workspace:manage, bump a
 * version, and are audited like the member writes.
 */
import { http, HttpResponse } from 'msw';
import { IntegrationSettingsSchema, type Integration } from '../api/integrations';
import type { Tenant } from '../api/schemas';
import { auditWorkspace } from './b2b';
import { currentSession, db } from './db';
import { error, handle } from './route';
import { SEED_EPOCH } from './seed';

const API = '*/api/t/:tenant';
const DAY = 24 * 3600 * 1000;

type Entry = Pick<Integration, 'id' | 'name' | 'category' | 'description'>;

const CATALOGUE: readonly Entry[] = [
  { id: 'relay', name: 'Relay', category: 'chat', description: 'Post new records, approvals and overdue renewals to a channel.' },
  { id: 'almanac', name: 'Almanac', category: 'calendar', description: 'Put every renewal date on your team’s calendar.' },
  { id: 'northstar', name: 'Northstar CRM', category: 'crm', description: 'Keep accounts and their owners in step with your CRM.' },
  { id: 'ledgerline', name: 'Ledgerline', category: 'accounting', description: 'Send contract values to your books when a record goes active.' },
  { id: 'parcel', name: 'Parcel Drive', category: 'storage', description: 'Attach files from your team drive to records.' },
  { id: 'hookshot', name: 'Hookshot', category: 'automation', description: 'Start a workflow whenever a record is created or changes status.' },
];

interface IntegrationState {
  items: Integration[];
  writes: number;
}

const states = new WeakMap<object, IntegrationState>();

const seed = (tenant: Tenant): Integration[] =>
  CATALOGUE.map((entry) =>
    tenant === 'acme' && entry.id === 'relay'
      ? { ...entry, status: 'connected', connectedBy: 'acme-p02', connectedAt: new Date(SEED_EPOCH - 20 * DAY).toISOString(), settings: { frequency: 'realtime', direction: 'one-way' }, version: 2 }
      : { ...entry, status: 'available', connectedBy: null, connectedAt: null, settings: null, version: 1 },
  );

export const integrationState = (tenant: Tenant): IntegrationState => {
  const partition = db(tenant);
  let found = states.get(partition);
  if (!found) {
    found = { items: seed(tenant), writes: 0 };
    states.set(partition, found);
  }
  return found;
};

/** The signed-in person's id in this workspace's directory. */
const me = (tenant: Tenant) => db(tenant).people.find((p) => p.email === currentSession().user.email)?.id ?? 'unknown';

const write = (tenant: Tenant, id: string, change: (current: Integration, at: string) => Integration | Response): Response => {
  const s = integrationState(tenant);
  const index = s.items.findIndex((i) => i.id === id);
  const current = s.items[index];
  if (!current) return error(404, 'not_found', 'There’s no such app.');
  s.writes += 1;
  const next = change(current, new Date(SEED_EPOCH + s.writes * 60 * 1000).toISOString());
  if (next instanceof Response) return next;
  s.items[index] = next;
  return HttpResponse.json(next);
};

export const integrationHandlers = [
  http.get(
    `${API}/integrations`,
    handle('workspace:read', ({ tenant }) => HttpResponse.json({ items: integrationState(tenant).items })),
  ),

  http.post(
    `${API}/integrations/:id/connect`,
    handle('workspace:manage', ({ tenant, params }) =>
      write(tenant, String(params.id), (current, at) => {
        if (current.status === 'connected') return error(409, 'already_connected', `${current.name} is already connected.`);
        auditWorkspace(tenant, 'integration.connected', { type: 'integration', id: current.id, label: current.name });
        return { ...current, status: 'connected', connectedBy: me(tenant), connectedAt: at, settings: { frequency: 'hourly', direction: 'one-way' }, version: current.version + 1 };
      }),
    ),
  ),

  http.post(
    `${API}/integrations/:id/disconnect`,
    handle('workspace:manage', ({ tenant, params }) =>
      write(tenant, String(params.id), (current) => {
        if (current.status !== 'connected') return error(409, 'not_connected', `${current.name} isn’t connected.`);
        auditWorkspace(tenant, 'integration.disconnected', { type: 'integration', id: current.id, label: current.name });
        return { ...current, status: 'available', connectedBy: null, connectedAt: null, settings: null, version: current.version + 1 };
      }),
    ),
  ),

  http.patch(
    `${API}/integrations/:id`,
    handle('workspace:manage', async ({ tenant, params, request }) => {
      const body = (await request.json()) as { settings?: unknown };
      const settings = IntegrationSettingsSchema.safeParse(body.settings);
      if (!settings.success) return error(422, 'invalid', 'Choose how often and which way to sync.');
      const version = Number(/^"(\d+)"$/.exec(request.headers.get('If-Match') ?? '')?.[1] ?? Number.NaN);
      return write(tenant, String(params.id), (current) => {
        if (current.status !== 'connected' || !current.settings) return error(409, 'not_connected', `${current.name} isn’t connected.`);
        if (version !== current.version) return error(409, 'conflict', 'Someone else changed these settings since you opened them.');
        const before = current.settings;
        const changes = (['frequency', 'direction'] as const)
          .filter((field) => before[field] !== settings.data[field])
          .map((field) => ({ field, before: before[field], after: settings.data[field] }));
        auditWorkspace(tenant, 'integration.updated', { type: 'integration', id: current.id, label: current.name }, changes);
        return { ...current, settings: settings.data, version: current.version + 1 };
      });
    }),
  ),
];
