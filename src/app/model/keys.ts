/**
 * Cache keys: [tenant, resource, params]. The tenant leads every key, so one workspace's data can
 * never answer for another's, and invalidation can be as narrow as one resource in one tenant.
 */
import type { RecordFilter, RecordQuery, Tenant } from '../api/schemas';

export const recordKeys = {
  /** Every list page of every query: invalidate this when membership, order or totals may change. */
  lists: (tenant: Tenant) => [tenant, 'records'] as const,
  list: (tenant: Tenant, query: RecordQuery) => [tenant, 'records', query] as const,
  /** Every tab count. */
  counts: (tenant: Tenant) => [tenant, 'record-counts'] as const,
  count: (tenant: Tenant, filter: Omit<RecordFilter, 'view'>) => [tenant, 'record-counts', filter] as const,
  detail: (tenant: Tenant, id: string) => [tenant, 'record', { id }] as const,
  people: (tenant: Tenant) => [tenant, 'people', {}] as const,
};

export const accountKeys = {
  /** The whole directory of accounts (reference data, loaded whole). */
  list: (tenant: Tenant) => [tenant, 'accounts', {}] as const,
  detail: (tenant: Tenant, id: string) => [tenant, 'account', { id }] as const,
};
