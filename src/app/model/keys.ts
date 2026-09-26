/**
 * Cache keys: [tenant, scope, resource, params]. The partition (tenant, then permission scope)
 * leads every key:
 *   tenant  one workspace's data can never answer for another's;
 *   scope   responses differ by role (a viewer's lists have no drafts), so a narrower role never
 *           reads what a broader one cached, and a permission change can drop a whole partition.
 * Invalidation can still be as narrow as one resource in one partition.
 */
import type { RecordFilter, RecordQuery, Tenant } from '../api/schemas';

/** Where cached data belongs: the workspace, then the permission scope the server answered for. */
export type Partition = readonly [tenant: Tenant, scope: string];

export const recordKeys = {
  /** Every list page of every query: invalidate this when membership, order or totals may change. */
  lists: (p: Partition) => [...p, 'records'] as const,
  list: (p: Partition, query: RecordQuery) => [...p, 'records', query] as const,
  /** Every tab count. */
  counts: (p: Partition) => [...p, 'record-counts'] as const,
  count: (p: Partition, filter: Omit<RecordFilter, 'view'>) => [...p, 'record-counts', filter] as const,
  detail: (p: Partition, id: string) => [...p, 'record', { id }] as const,
  people: (p: Partition) => [...p, 'people', {}] as const,
};

export const accountKeys = {
  /** The whole directory of accounts (reference data, loaded whole). */
  list: (p: Partition) => [...p, 'accounts', {}] as const,
  detail: (p: Partition, id: string) => [...p, 'account', { id }] as const,
};

export const viewKeys = {
  /** The signed-in person's saved views in this partition. */
  list: (p: Partition) => [...p, 'views', {}] as const,
};


export const jobKeys = {
  /** The signed-in person's jobs in this partition, polled while any is running. */
  list: (p: Partition) => [...p, 'jobs', {}] as const,
};
