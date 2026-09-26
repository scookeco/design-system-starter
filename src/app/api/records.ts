/**
 * Record endpoints. Each takes the tenant first: the tenant is part of every request, as it is of
 * every cache key. These are transport only; the cache policy lives in src/app/model.
 */
import { request } from './client';
import {
  BulkDeleteResultSchema,
  PeopleSchema,
  PersonSchema,
  RecordCountsSchema,
  RecordPageSchema,
  RecordSchema,
  type MovableStatus,
  type RecordFilter,
  type RecordQuery,
  type Tenant,
} from './schemas';

const base = (tenant: Tenant) => `/t/${tenant}`;

const filterParams = (filter: RecordFilter) => {
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.status.length > 0) params.set('status', filter.status.join(','));
  params.set('view', filter.view);
  if (filter.account) params.set('account', filter.account);
  if (filter.owner) params.set('owner', filter.owner);
  return params;
};

export const listRecords = (tenant: Tenant, query: RecordQuery, signal?: AbortSignal) => {
  const params = filterParams(query);
  params.set('sort', query.sort);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  return request(RecordPageSchema, `${base(tenant)}/records?${params.toString()}`, { signal });
};

export const countRecords = (tenant: Tenant, filter: Omit<RecordFilter, 'view'>, signal?: AbortSignal) => {
  const params = filterParams({ ...filter, view: 'all' });
  params.delete('view');
  return request(RecordCountsSchema, `${base(tenant)}/records/counts?${params.toString()}`, { signal });
};

export const getRecord = (tenant: Tenant, id: string, signal?: AbortSignal) =>
  request(RecordSchema, `${base(tenant)}/records/${encodeURIComponent(id)}`, { signal });

export const listPeople = (tenant: Tenant, signal?: AbortSignal) => request(PeopleSchema, `${base(tenant)}/people`, { signal });

export const postPerson = (tenant: Tenant, name: string) => request(PersonSchema, `${base(tenant)}/people`, { method: 'POST', body: { name } });

/** A new record. A quick create sends just the name; the server defaults the rest (owner: you). */
export interface NewRecord {
  name: string;
  ownerId?: string;
  /** The account it belongs to, by id; null (or left out) for none yet. */
  accountId?: string | null;
  amountMinor?: number;
  renewsOn?: string;
  tags?: readonly string[];
}

/** Not naturally idempotent, so it carries a key: a retried or double-sent create makes one record. */
export const postRecord = (tenant: Tenant, record: NewRecord, idempotencyKey: string) =>
  request(RecordSchema, `${base(tenant)}/records`, { method: 'POST', body: record, headers: { 'Idempotency-Key': idempotencyKey } });

/** What an edit can change. Only the fields sent change; money goes as integer minor units. */
export interface RecordChanges {
  name?: string;
  ownerId?: string;
  accountId?: string | null;
  amountMinor?: number;
  renewsOn?: string;
  tags?: readonly string[];
}

/**
 * A versioned edit: `If-Match` carries the version it was based on, and the server answers 409, with
 * the record as it is now, if someone changed it since. A name-only edit is a rename (record:rename);
 * anything else needs record:edit.
 */
export const patchRecord = (tenant: Tenant, id: string, changes: RecordChanges, version: number) =>
  request(RecordSchema, `${base(tenant)}/records/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes, ifMatch: version });

export const patchRecordName = (tenant: Tenant, id: string, name: string, version: number) => patchRecord(tenant, id, { name }, version);

/** Move between statuses (a board column). Versioned: a stale move gets a 409. */
export const postStatus = (tenant: Tenant, id: string, status: MovableStatus, version: number) =>
  request(RecordSchema, `${base(tenant)}/records/${encodeURIComponent(id)}/status`, { method: 'POST', body: { status }, ifMatch: version });

/** Undo an archive: back to the status it had. Versioned, and allowed only for an archived record. */
export const postRestore = (tenant: Tenant, id: string, status: MovableStatus, version: number) =>
  request(RecordSchema, `${base(tenant)}/records/${encodeURIComponent(id)}/restore`, { method: 'POST', body: { status }, ifMatch: version });

export const postArchive = (tenant: Tenant, id: string) =>
  request(RecordSchema, `${base(tenant)}/records/${encodeURIComponent(id)}/archive`, { method: 'POST' });

/** Deletes by ids, or by a filter ("all 312 matching"), so the selection never has to be loaded. */
export const postBulkDelete = (tenant: Tenant, selection: { ids: readonly string[] } | { filter: RecordFilter }) =>
  request(BulkDeleteResultSchema, `${base(tenant)}/records/bulk-delete`, { method: 'POST', body: selection });
