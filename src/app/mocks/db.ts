/**
 * The mock server's in-memory database, one partition per tenant. Seeded deterministically and
 * reset before every story and test, so one story's writes never leak into the next.
 */
import { TENANTS, type Account, type Person, type RecordEntity, type Tenant } from '../api/schemas';
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

export const resetDb = () => {
  partitions = new Map(TENANTS.map((tenant) => [tenant, fresh(tenant)]));
  writes = 0;
};

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
