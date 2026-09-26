/**
 * Account endpoints: transport only, the tenant first, every response parsed at the boundary.
 * The cache policy lives in src/app/model.
 */
import { request } from './client';
import { AccountSchema, AccountsSchema, type Tenant } from './schemas';

const base = (tenant: Tenant) => `/t/${tenant}/accounts`;

/** Every account in the workspace. Accounts are reference data: a few dozen, loaded whole and joined by id. */
export const listAccounts = (tenant: Tenant, signal?: AbortSignal) => request(AccountsSchema, base(tenant), { signal });

export const getAccount = (tenant: Tenant, id: string, signal?: AbortSignal) => request(AccountSchema, `${base(tenant)}/${encodeURIComponent(id)}`, { signal });

/** What a create or an edit sends. Money goes as integer minor units in the workspace's currency. */
export interface AccountInput {
  name: string;
  domain: string;
  industry: string;
  ownerId: string;
  arrMinor: number;
  customerSince: string;
}

/** Not naturally idempotent, so it carries a key, like a record create. */
export const postAccount = (tenant: Tenant, account: AccountInput, idempotencyKey: string) =>
  request(AccountSchema, base(tenant), { method: 'POST', body: account, headers: { 'Idempotency-Key': idempotencyKey } });

/** Sends the version it was based on; a stale edit gets a 409. */
export const patchAccount = (tenant: Tenant, id: string, changes: Partial<AccountInput>, version: number) =>
  request(AccountSchema, `${base(tenant)}/${encodeURIComponent(id)}`, { method: 'PATCH', body: { ...changes, version } });
