/**
 * Deterministic seed data: the same records, in the same order, on every run and every machine.
 * A seeded PRNG stands in for randomness, and every date is computed from SEED_EPOCH, never from
 * the clock. (The visual suite freezes the page clock at the same instant, so "3 days ago" holds.)
 */
import type { Account, Person, RecordEntity, RecordStatus, Tenant } from '../api/schemas';
import { WORKSPACES } from '../workspaces';

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
  people: readonly string[];
  /** Customer organisations: name and web domain. */
  accounts: readonly (readonly [string, string])[];
}

export const TENANT_SPECS: Record<Tenant, TenantSpec> = {
  acme: {
    seed: 1001,
    count: 240,
    people: ['Sam Rivera', 'Priya Natarajan', 'Jo Okafor', 'Mei Chen', 'Lucas Moreau', 'Amara Diallo', 'Noah Fischer', 'Sofia Rossi'],
    accounts: [
      ['Northwind Traders', 'northwind.example'],
      ['Blue Harbor Logistics', 'blueharbor.example'],
      ['Contoso Health', 'contoso-health.example'],
      ['Fabrikam Studios', 'fabrikam.example'],
      ['Tailspin Air', 'tailspin.example'],
      ['Wide World Importers', 'wideworld.example'],
      ['Litware Labs', 'litware.example'],
      ['Adventure Works', 'adventure-works.example'],
      ['Proseware', 'proseware.example'],
      ['Lamna Energy', 'lamna.example'],
      ['Woodgrove Bank', 'woodgrove.example'],
      ['Coho Vineyard', 'coho.example'],
    ],
  },
  globex: {
    seed: 2002,
    count: 120,
    people: ['Lena Vogel', 'Mateo García', 'Aiko Tanaka', 'Omar Haddad', 'Ingrid Berg'],
    accounts: [
      ['Alpenglanz AG', 'alpenglanz.example'],
      ['Brisa Móvil', 'brisa.example'],
      ['Kitsune Robotics', 'kitsune.example'],
      ['Nordlys Shipping', 'nordlys.example'],
      ['Olivar Foods', 'olivar.example'],
      ['Sahel Solar', 'sahel.example'],
      ['Vesta Insurance', 'vesta.example'],
      ['Zinnober Chemie', 'zinnober.example'],
    ],
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

const INDUSTRIES = ['Retail', 'Logistics', 'Healthcare', 'Media', 'Travel', 'Wholesale', 'Software', 'Manufacturing', 'Energy', 'Finance'];

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

/** "Mateo García" → mateo.garcia@example.com */
export const emailFor = (name: string) =>
  `${name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')}@example.com`;

export const seedPeople = (tenant: Tenant): Person[] =>
  TENANT_SPECS[tenant].people.map((name, index) => ({ id: `${tenant}-p${String(index + 1).padStart(2, '0')}`, name, email: emailFor(name) }));

/**
 * Accounts draw from their own PRNG stream (seed + 1), so adding them left every record's
 * name, status and amount exactly as it was.
 */
export const seedAccounts = (tenant: Tenant): Account[] => {
  const spec = TENANT_SPECS[tenant];
  const random = seededRandom(spec.seed + 1);
  const people = seedPeople(tenant);
  return spec.accounts.map(([name, domain], index) => ({
    id: `${tenant}-a${String(index + 1).padStart(2, '0')}`,
    name,
    domain,
    industry: INDUSTRIES[index % INDUSTRIES.length] as string,
    ownerId: (people[index % people.length] as Person).id,
    arr: { minor: Math.round(random() * 900_000 + 20_000) * 100, currency: WORKSPACES[tenant].currency },
    customerSince: isoDate(SEED_EPOCH - Math.floor(random() * 5 * 365) * DAY),
    version: 1,
  }));
};

export const seedRecords = (tenant: Tenant): RecordEntity[] => {
  const spec = TENANT_SPECS[tenant];
  const random = seededRandom(spec.seed);
  // Which account a record belongs to comes from a stream of its own (seed + 2): the record stream is untouched.
  const accountRandom = seededRandom(spec.seed + 2);
  const people = seedPeople(tenant);
  const accounts = seedAccounts(tenant);
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
      ownerId: pick(random, people).id,
      accountId: pick(accountRandom, accounts).id,
      status,
      amount: { minor: amount, currency: WORKSPACES[tenant].currency },
      updatedAt: new Date(updatedAt).toISOString(),
      renewsOn: isoDate(SEED_EPOCH + Math.floor(random() * 400) * DAY),
      tags,
      version: 1,
    };
  });
};
