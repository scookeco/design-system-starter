/**
 * The mock live channel and "another user". A colleague's change is written to the mock database
 * like any write (the version bumps), then published to every subscriber in that workspace,
 * filtered by what the subscriber's grant can see, as a real server's event stream would be.
 *
 * Delivery is synchronous and in process, so a story or a test decides exactly when a change
 * arrives: the gallery's "Another user…" toolbar pushes one on demand, and a story's
 * `mockApi({ anotherUser: [...] })` pushes its changes once the page has loaded.
 */
import type { LiveEvent, LiveSource } from '../api/live';
import type { RecordEntity, RecordStatus, Tenant } from '../api/schemas';
import { canSee } from '../model/permissions';
import { db, grantFor, touch } from './db';
import { WORKSPACES } from '../workspaces';
import { SEED_EPOCH } from './seed';

const listeners = new Map<Tenant, Set<(data: unknown) => void>>();

/** The in-process event stream: what the gallery and the tests pass to AppProviders as `live`. */
export const mockLive: LiveSource = {
  subscribe: (tenant, onMessage) => {
    const set = listeners.get(tenant) ?? new Set();
    listeners.set(tenant, set);
    set.add(onMessage);
    return () => set.delete(onMessage);
  },
};

/** How many subscribers a workspace has right now (tests check that a switch or sign-out unsubscribes). */
export const subscriberCount = (tenant: Tenant) => listeners.get(tenant)?.size ?? 0;

/** Send a raw message, as a misbehaving server might (tests of the boundary). */
export const sendRaw = (tenant: Tenant, data: unknown) => listeners.get(tenant)?.forEach((listener) => listener(data));

/**
 * Publish a change as the recipient's grant sees it: a record that becomes visible is created for
 * them, one that stops being visible is deleted, and one they never see sends nothing.
 */
export const publishRecordChange = (tenant: Tenant, before: RecordEntity | undefined, after: RecordEntity | undefined, by: string) => {
  const grant = grantFor(tenant);
  const sawBefore = before !== undefined && canSee(grant, before);
  const seesAfter = after !== undefined && canSee(grant, after);
  let event: LiveEvent | undefined;
  if (after && seesAfter) event = sawBefore ? { type: 'record.updated', record: after, by } : { type: 'record.created', record: after, by };
  else if (before && sawBefore) event = { type: 'record.deleted', id: before.id, by };
  if (event) sendRaw(tenant, event);
};

/** The colleague whose changes these are: a real person in the workspace, by id. */
export const OTHER_PERSON: Record<Tenant, string> = { acme: 'acme-p02', globex: 'globex-p02' };

/** What another user can change on a record. */
export interface RecordChanges {
  name?: string;
  ownerId?: string;
  amountMinor?: number;
  status?: RecordStatus;
  tags?: readonly string[];
}

export type AnotherUserChange =
  /** Edit a record (default: the first one the default list shows). `silent`: the event is lost (a dropped connection), so only a write will find out. */
  | { kind: 'edit'; id?: string; changes?: RecordChanges; silent?: boolean }
  /** Add a record (default: a pending one, so every role sees it). */
  | { kind: 'add'; name?: string; status?: RecordStatus }
  | { kind: 'delete'; id?: string };

const ADDED_NAMES = ['Regional hosting agreement', 'Pilot security retainer', 'Annual catering order', 'Framework licensing schedule'];

/** The record the default list (all, by name) shows first: what the toolbar's edit and delete act on. */
export const firstListedRecord = (tenant: Tenant): RecordEntity | undefined => {
  const grant = grantFor(tenant);
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  return db(tenant)
    .records.filter((r) => r.status !== 'archived' && canSee(grant, r))
    .sort((a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id))[0];
};

/** Make a change as another person in the workspace: write it, then publish it. Returns the record's id. */
export function anotherUser(tenant: Tenant, change: AnotherUserChange): string | undefined {
  const partition = db(tenant);
  const by = OTHER_PERSON[tenant];

  if (change.kind === 'add') {
    const record = touch({
      id: `${tenant === 'acme' ? 'r' : 'g'}-${String(partition.nextId)}`,
      name: change.name ?? (ADDED_NAMES[partition.nextId % ADDED_NAMES.length] as string),
      ownerId: by,
      accountId: partition.accounts[0]?.id ?? null,
      status: change.status ?? 'pending',
      amount: { minor: 1_250_000, currency: WORKSPACES[tenant].currency },
      updatedAt: new Date(SEED_EPOCH).toISOString(),
      renewsOn: new Date(SEED_EPOCH + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      tags: [],
      version: 0,
    });
    partition.nextId += 1;
    partition.records.unshift(record);
    publishRecordChange(tenant, undefined, record, by);
    return record.id;
  }

  const id = change.id ?? firstListedRecord(tenant)?.id;
  const index = partition.records.findIndex((r) => r.id === id);
  const before = partition.records[index];
  if (!before) return undefined;

  if (change.kind === 'delete') {
    partition.records.splice(index, 1);
    publishRecordChange(tenant, before, undefined, by);
    return before.id;
  }

  const { amountMinor, ...rest } = change.changes ?? { name: `${before.name} (revised)`, amountMinor: before.amount.minor + 500_000 };
  const after = touch({ ...before, ...rest, ...(amountMinor === undefined ? {} : { amount: { ...before.amount, minor: amountMinor } }), tags: [...(rest.tags ?? before.tags)] });
  partition.records[index] = after;
  if (!change.silent) publishRecordChange(tenant, before, after, by);
  return after.id;
}
