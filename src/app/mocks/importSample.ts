/**
 * A CSV someone might import, generated from the seed like everything else: the gallery's and the
 * tests' sample file. Most rows are good; five break one rule each, so the review step has
 * something to show (an unknown owner, an amount with a currency sign, a date in the wrong order,
 * a status the workspace doesn't use, a missing name).
 */
import type { Tenant } from '../api/schemas';
import { toCsv } from '../model/csv';
import { seededRandom, seedAccounts, seedPeople, TENANT_SPECS } from './seed';

const PREFIXES = ['Annual', 'Regional', 'Pilot', 'Framework', 'Extended', 'Interim'];
const SUBJECTS = ['hosting', 'catering', 'security', 'licensing', 'maintenance', 'logistics'];
const KINDS = ['agreement', 'order', 'retainer', 'schedule', 'renewal'];
const STATUSES = ['Draft', 'Pending', 'Active', 'Active', 'Overdue'];

export const SAMPLE_IMPORT_FILE = 'renewals.csv';
export const SAMPLE_IMPORT_HEADERS = ['Record name', 'Owner email', 'Customer', 'Stage', 'Contract value', 'Renewal date'] as const;

/** Rows (with no header) that break a rule, by their row number in the file, and how. */
export const SAMPLE_IMPORT_BROKEN: Readonly<Record<number, string>> = {
  6: 'unknown owner',
  13: 'amount with a currency sign',
  20: 'date in the wrong order',
  31: 'unknown status',
  42: 'missing name',
};

/** The sample's rows, as strings, in the header's order. */
export const sampleImportRows = (tenant: Tenant, count = 48): string[][] => {
  const random = seededRandom(TENANT_SPECS[tenant].seed + 6);
  const people = seedPeople(tenant);
  const accounts = seedAccounts(tenant);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)] as T;
  return Array.from({ length: count }, (_, index) => {
    const row = index + 2;
    const name = `${pick(PREFIXES)} ${pick(SUBJECTS)} ${pick(KINDS)}`;
    const owner = pick(people).email;
    const account = random() < 0.2 ? '' : pick(accounts).name;
    const status = pick(STATUSES);
    const amount = String(Math.round(random() * 90_000 + 1_000));
    const month = String(Math.floor(random() * 12) + 1).padStart(2, '0');
    const renews = `2027-${month}-${String(Math.floor(random() * 28) + 1).padStart(2, '0')}`;
    const cells = [name, owner, account, status, amount, renews];
    if (row === 6) cells[1] = 'pat.nobody@example.com';
    if (row === 13) cells[4] = `$${amount}`;
    if (row === 20) cells[5] = `${renews.slice(8)}/${renews.slice(5, 7)}/2027`;
    if (row === 31) cells[3] = 'Won';
    if (row === 42) cells[0] = '';
    return cells;
  });
};

/** The whole file, as a person would pick it. */
export const sampleImportCsv = (tenant: Tenant, count?: number) => toCsv([[...SAMPLE_IMPORT_HEADERS], ...sampleImportRows(tenant, count)]);
