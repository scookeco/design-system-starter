/**
 * Integrations: the catalogue of apps a workspace can connect, each connected or not, with its
 * settings. Contract and endpoints, the tenant first, every response parsed at the boundary.
 * Connecting, disconnecting and changing settings are the server's decision (it may refuse), so
 * the page presents them pessimistically.
 */
import { z } from 'zod';
import { request } from './client';
import type { Tenant } from './schemas';

export const INTEGRATION_CATEGORIES = ['chat', 'calendar', 'crm', 'accounting', 'storage', 'automation'] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export const SYNC_FREQUENCIES = ['realtime', 'hourly', 'daily'] as const;
export const SYNC_DIRECTIONS = ['one-way', 'two-way'] as const;

export const IntegrationSettingsSchema = z.object({
  frequency: z.enum(SYNC_FREQUENCIES),
  direction: z.enum(SYNC_DIRECTIONS),
});
export type IntegrationSettings = z.infer<typeof IntegrationSettingsSchema>;

export const IntegrationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(INTEGRATION_CATEGORIES),
  description: z.string().min(1),
  status: z.enum(['connected', 'available']),
  /** Who connected it (a person, by id) and when; null while it isn't connected. */
  connectedBy: z.string().min(1).nullable(),
  connectedAt: z.iso.datetime({ offset: true }).nullable(),
  /** Its settings while connected; null otherwise (disconnecting drops them). */
  settings: IntegrationSettingsSchema.nullable(),
  /** Bumped on every write: a settings save sends the version it started from. */
  version: z.number().int().nonnegative(),
});
export type Integration = z.infer<typeof IntegrationSchema>;
export const IntegrationsSchema = z.object({ items: z.array(IntegrationSchema) });

const base = (tenant: Tenant) => `/t/${tenant}/integrations`;
const one = (tenant: Tenant, id: string) => `${base(tenant)}/${encodeURIComponent(id)}`;

export const listIntegrations = (tenant: Tenant, signal?: AbortSignal) => request(IntegrationsSchema, base(tenant), { signal });
export const postConnect = (tenant: Tenant, id: string) => request(IntegrationSchema, `${one(tenant, id)}/connect`, { method: 'POST' });
export const postDisconnect = (tenant: Tenant, id: string) => request(IntegrationSchema, `${one(tenant, id)}/disconnect`, { method: 'POST' });
/** A versioned write: the version these settings were read at, as If-Match. A stale one is a 409. */
export const patchIntegrationSettings = (tenant: Tenant, id: string, settings: IntegrationSettings, version: number) =>
  request(IntegrationSchema, one(tenant, id), { method: 'PATCH', body: { settings }, ifMatch: version });
