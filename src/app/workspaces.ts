/**
 * Per-tenant settings the client needs before any record loads. In a product these come from the
 * session or a workspace endpoint; the mock server seeds its data from the same values.
 */
import type { Tenant } from './api/schemas';

export const WORKSPACES: Record<Tenant, { name: string; currency: string }> = {
  acme: { name: 'Acme', currency: 'USD' },
  globex: { name: 'Globex', currency: 'EUR' },
};
