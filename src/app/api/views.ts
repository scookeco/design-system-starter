/**
 * Saved-view endpoints: the signed-in person's views in one workspace. The server stores them per
 * person per workspace; the client never sends whose they are.
 */
import { z } from 'zod';
import { request } from './client';
import { SavedViewSchema, SavedViewsSchema, type SavedViewConfig, type Tenant } from './schemas';

const base = (tenant: Tenant) => `/t/${tenant}/views`;

export const listViews = (tenant: Tenant, signal?: AbortSignal) => request(SavedViewsSchema, base(tenant), { signal });

export const postView = (tenant: Tenant, view: { name: string; config: SavedViewConfig }) => request(SavedViewSchema, base(tenant), { method: 'POST', body: view });

/** Rename, replace the config, or make it the default (which unsets the previous default). */
export const patchView = (tenant: Tenant, id: string, changes: Partial<{ name: string; config: SavedViewConfig; isDefault: boolean }>) =>
  request(SavedViewSchema, `${base(tenant)}/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });

export const deleteView = (tenant: Tenant, id: string) => request(z.object({ deleted: z.string() }), `${base(tenant)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
