/**
 * Deterministic seed data: the same records, in the same order, on every run and every machine.
 * A seeded PRNG stands in for randomness, and every date is computed from SEED_EPOCH, never from
 * the clock. (The visual suite freezes the page clock at the same instant, so "3 days ago" holds.)
 */
import type { Person, RecordEntity, RecordStatus, Tenant } from '../api/schemas';

/** The "today" the data was generated for. Matches the visual harness's frozen clock. */
export const SEED_EPOCH = Date.parse('2026-09-25T12:00:00Z');

/** mulberry32: a tiny, fast, seedable PRNG. Same seed, same sequence. */
export const seededRandom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface TenantSpec {
  seed: number;
  count: number;
  currency: string;
  people: readonly string[];
}

export const TENANT_SPECS: Record<Tenant, TenantSpec> = {
  acme: {
    seed: 1001,
    count: 240,
    currency: 'USD',
    people: ['Sam Rivera', 'Priya Natarajan', 'Jo Okafor', 'Mei Chen', 'Lucas Moreau', 'Amara Diallo', 'Noah Fischer', 'Sofia Rossi'],
  },
  globex: {
    seed: 2002,
    count: 120,
    currency: 'EUR',
    people: ['Lena Vogel', 'Mateo García', 'Aiko Tanaka', 'Omar Haddad', 'Ingrid Berg'],
  },
};

const PREFIXES = ['Annual', 'Master', 'Regional', 'Quarterly', 'Framework', 'Pilot', 'Global', 'Local', 'Interim', 'Extended'];
const SUBJECTS = ['services', 'hardware', 'software', 'cleaning', 'consulting', 'catering', 'logistics', 'security', 'marketing', 'licensing', 'maintenance', 'hosting'];
const KINDS = ['agreement', 'lease', 'retainer', 'addendum', 'order', 'renewal', 'contract', 'schedule'];
const TAGS = ['priority', 'renewal', 'vendor', 'customer', 'internal', 'legal-hold'];
/** Weighted: most records are active, few are archived. */
const STATUS_WEIGHTS: readonly [RecordStatus, number][] = [
  ['active', 0.4],
  ['pending', 0.2],
  ['overdue', 0.1],
  ['draft', 0.2],
  ['archived', 0.1],
];

const DAY = 24 * 3600 * 1000;

const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

const pickStatus = (random: () => number): RecordStatus => {
  let roll = random();
  for (const [status, weight] of STATUS_WEIGHTS) {
    if (roll < weight) return status;
    roll -= weight;
  }
  return 'active';
};

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const seedPeople = (tenant: Tenant): Person[] =>
  TENANT_SPECS[tenant].people.map((name, index) => ({ id: `${tenant}-p${String(index + 1).padStart(2, '0')}`, name }));

export const seedRecords = (tenant: Tenant): RecordEntity[] => {
  const spec = TENANT_SPECS[tenant];
  const random = seededRandom(spec.seed);
  const people = seedPeople(tenant);
  return Array.from({ length: spec.count }, (_, index) => {
    const name = `${pick(random, PREFIXES)} ${pick(random, SUBJECTS)} ${pick(random, KINDS)}`;
    const status = pickStatus(random);
    // Round amounts to whole units, between 0 and 250,000; drafts may still be zero.
    const amount = status === 'draft' && random() < 0.3 ? 0 : Math.round(random() * 250_000) * 100;
    const updatedAt = SEED_EPOCH - Math.floor(random() * 120 * DAY) - Math.floor(random() * DAY);
    const tags = TAGS.filter(() => random() < 0.12);
    return {
      id: `${tenant === 'acme' ? 'r' : 'g'}-${String(1001 + index)}`,
      name,
      owner: pick(random, people),
      status,
      amount: { minor: amount, currency: spec.currency },
      updatedAt: new Date(updatedAt).toISOString(),
      renewsOn: isoDate(SEED_EPOCH + Math.floor(random() * 400) * DAY),
      tags,
      version: 1,
    };
  });
};
