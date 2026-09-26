/**
 * The mock server's in-memory database, one partition per tenant. Seeded deterministically and
 * reset before every story and test, so one story's writes never leak into the next.
 */
import { SessionSchema, TENANTS, type Account, type Person, type RecordEntity, type Role, type Session, type Tenant } from '../api/schemas';
import { ROLE_CAPABILITIES, type Grant } from '../model/permissions';
import { SEED_EPOCH, seedAccounts, seedPeople, seedRecords } from './seed';

interface Partition {
  records: RecordEntity[];
  people: Person[];
  accounts: Account[];
  /** Idempotency-Key → what that request created. A replayed create returns it again. */
  created: Map<string, RecordEntity | Account>;
  nextId: number;
}

const fresh = (tenant: Tenant): Partition => {
  const records = seedRecords(tenant);
  return { records, people: seedPeople(tenant), accounts: seedAccounts(tenant), created: new Map(), nextId: 1001 + records.length };
};

let partitions = new Map<Tenant, Partition>();
let writes = 0;

/**
 * The identity provider's side: who is signed in, and their role per workspace. The server reads
 * the role from here on every request (never from the request itself), so a client that skips its
 * own checks still gets a 403.
 */
const SIGNED_IN = { id: 'u-sam', name: 'Sam Rivera', email: 'sam.rivera@example.com' };
const ADMIN_EVERYWHERE = Object.fromEntries(TENANTS.map((t) => [t, 'admin'])) as Record<Tenant, Role>;
let roles: Record<Tenant, Role> = { ...ADMIN_EVERYWHERE };
let signedIn = true;

export const resetDb = () => {
  partitions = new Map(TENANTS.map((tenant) => [tenant, fresh(tenant)]));
  writes = 0;
  roles = { ...ADMIN_EVERYWHERE };
  signedIn = true;
};

/** Sign-out ends the session on the server: every later request is a 401. */
export const endSession = () => {
  signedIn = false;
};
export const isSignedIn = () => signedIn;

/** Set the signed-in person's role: one for every workspace, or per workspace. Stories and tests use this. */
export const setRoles = (next: Role | Partial<Record<Tenant, Role>>) => {
  roles = typeof next === 'string' ? (Object.fromEntries(TENANTS.map((t) => [t, next])) as Record<Tenant, Role>) : { ...roles, ...next };
};

/** What the server grants in a workspace right now: capabilities derived from the role, in one place. */
export const grantFor = (tenant: Tenant): Grant => ({ capabilities: ROLE_CAPABILITIES[roles[tenant]] });

/** The session as GET /api/session returns it (and as stories and tests hand it to the app). */
export const currentSession = (): Session =>
  SessionSchema.parse({
    user: SIGNED_IN,
    memberships: TENANTS.map((tenant) => ({ tenant, role: roles[tenant], capabilities: ROLE_CAPABILITIES[roles[tenant]], scope: roles[tenant] })),
  });

/** A write: bump the version and move updatedAt a second past the seed's "now", deterministically. */
export const touch = (record: RecordEntity): RecordEntity => {
  writes += 1;
  return { ...record, version: record.version + 1, updatedAt: new Date(SEED_EPOCH + writes * 1000).toISOString() };
};

/** A write to an entity without a timestamp: bump the version. */
export const bump = <T extends { version: number }>(entity: T): T => ({ ...entity, version: entity.version + 1 });
resetDb();

export const db = (tenant: Tenant): Partition => {
  const partition = partitions.get(tenant);
  if (!partition) throw new Error(`Unknown tenant ${tenant}`);
  return partition;
};
