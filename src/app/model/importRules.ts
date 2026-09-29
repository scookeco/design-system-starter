/**
 * The CSV import's rules, pure: read by the wizard's preview AND the mock server, so the two can't
 * disagree about what a valid row is. The named mutations live beside them (./imports.ts).
 *
 * Mapping: each import field (IMPORT_FIELDS, from the field registry's config) takes one CSV column
 * or none. A cell is read by its field's type with the parsers below; an empty optional cell takes
 * the field's default.
 */
import type { ImportRow } from '../api/imports';
import { MOVABLE_STATUSES, type Account, type MovableStatus, type Person } from '../api/schemas';
import { IMPORT_FIELDS, type ImportFieldId } from '../registries/recordFields';
import type { FieldType } from '../registries/fields';
import { STATUS } from './status';

/** What one import may hold. Shown before anyone picks a file (FileUpload's limits). */
export const IMPORT_LIMITS = { maxRows: 1_000, maxBytes: 1024 * 1024 } as const;

/** field id → the index of the CSV column it reads, or -1 for none. */
export type ColumnMapping = Record<ImportFieldId, number>;

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Pre-select a column for each field whose name or alias matches a header. The person can change any of them. */
export const guessMapping = (headers: readonly string[]): ColumnMapping => {
  const folded = headers.map(fold);
  const used = new Set<number>();
  return Object.fromEntries(
    IMPORT_FIELDS.map((field) => {
      const index = folded.findIndex((h, i) => !used.has(i) && (h === fold(field.label) || field.aliases.some((a) => h === fold(a))));
      if (index !== -1) used.add(index);
      return [field.id, index];
    }),
  ) as ColumnMapping;
};

/** What's wrong with a mapping, if anything: a required field left out, or one column used twice. */
export const mappingProblems = (mapping: ColumnMapping, headers: readonly string[]): string[] => {
  const problems: string[] = [];
  for (const field of IMPORT_FIELDS) if (field.required && mapping[field.id] === -1) problems.push(`Choose the column that holds each record’s ${field.label.toLowerCase()}.`);
  const seen = new Map<number, string>();
  for (const field of IMPORT_FIELDS) {
    const column = mapping[field.id];
    if (column === -1) continue;
    const other = seen.get(column);
    if (other) problems.push(`“${headers[column] ?? ''}” is chosen for both ${other} and ${field.label}. Choose it once.`);
    else seen.set(column, field.label);
  }
  return problems;
};

/** Rows as the server takes them: each row's cells by field id, from the mapped columns. */
export const mapRows = (rows: readonly (readonly string[])[], mapping: ColumnMapping): ImportRow[] =>
  rows.map((cells, index) => ({
    // The header is row 1 in the person's spreadsheet, so the first data row is row 2.
    row: index + 2,
    cells: Object.fromEntries(IMPORT_FIELDS.filter((f) => mapping[f.id] !== -1).map((f) => [f.id, (cells[mapping[f.id]] ?? '').trim()])),
  }));

/** What the rules need to know about the workspace: its people and accounts (matched by name), its currency, the importer. */
export interface ImportContext {
  people: readonly Pick<Person, 'id' | 'name' | 'email'>[];
  accounts: readonly Pick<Account, 'id' | 'name' | 'domain'>[];
  currency: string;
  /** Who owns a row with no owner: the person importing. */
  defaultOwnerId: string;
  /** A row with no renewal date renews a year after this calendar date. */
  today: string;
}

/** A row that passed: what the server will create. */
export interface ValidRecord {
  name: string;
  ownerId: string;
  accountId: string | null;
  status: MovableStatus;
  amountMinor: number;
  renewsOn: string;
}

export interface RowProblem {
  field: ImportFieldId;
  message: string;
}

type CellResult<T> = { value: T } | { error: string };

const minorDigits = (currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;

const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const addYear = (iso: string) => `${String(Number(iso.slice(0, 4)) + 1)}${iso.slice(4)}`;

/**
 * How a cell of each field type is read. Keyed on the FieldType union, like the field registry:
 * a new importable type doesn't compile until it has a parser. Errors say what to write instead.
 */
const PARSERS: { [K in FieldType]: (cell: string, context: ImportContext) => CellResult<unknown> } = {
  text: (cell) => (cell === '' ? { error: 'Enter a name.' } : cell.length > 120 ? { error: 'Use 120 characters or fewer.' } : { value: cell }),
  person: (cell, context) => {
    if (cell === '') return { value: context.defaultOwnerId };
    const person = context.people.find((p) => fold(p.name) === fold(cell) || p.email.toLowerCase() === cell.toLowerCase());
    return person ? { value: person.id } : { error: `No one called “${cell}” is in this workspace. Use a member’s name or email.` };
  },
  account: (cell, context) => {
    if (cell === '') return { value: null };
    const account = context.accounts.find((a) => fold(a.name) === fold(cell) || a.domain.toLowerCase() === cell.toLowerCase());
    return account ? { value: account.id } : { error: `There’s no account called “${cell}”. Add it first, or leave the cell empty.` };
  },
  status: (cell) => {
    if (cell === '') return { value: 'draft' };
    const status = MOVABLE_STATUSES.find((s) => fold(STATUS[s].label) === fold(cell) || s === fold(cell));
    return status ? { value: status } : { error: `Use ${MOVABLE_STATUSES.map((s) => STATUS[s].label).join(', ').replace(/, ([^,]*)$/, ' or $1')}.` };
  },
  money: (cell, context) => {
    if (cell === '') return { value: 0 };
    const digits = minorDigits(context.currency);
    const plain = cell.replace(/\s/g, '');
    const pattern = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${String(digits)}})?$`);
    if (!pattern.test(plain)) return { error: `Use digits${digits === 0 ? '' : ' with a dot for decimals'}, like ${digits === 0 ? '12500' : '12500.50'}, with no currency sign.` };
    return { value: Math.round(Number(plain) * 10 ** digits) };
  },
  date: (cell, context) => {
    if (cell === '') return { value: addYear(context.today) };
    return isCalendarDate(cell) ? { value: cell } : { error: 'Use a date like 2027-03-31.' };
  },
  // Not importable (yet): never in IMPORT_FIELDS, but the union needs an entry.
  tags: (cell) => ({ value: cell.split(',').map((t) => t.trim()).filter(Boolean) }),
};

const FIELD_KEY: Record<ImportFieldId, keyof ValidRecord> = { name: 'name', owner: 'ownerId', account: 'accountId', status: 'status', amount: 'amountMinor', renewsOn: 'renewsOn' };

/** THE row rule, for the preview and the server alike: the record it makes, or every problem with it. */
export const validateImportRow = (row: ImportRow, context: ImportContext): { record: ValidRecord } | { problems: RowProblem[] } => {
  const problems: RowProblem[] = [];
  const record: Partial<Record<keyof ValidRecord, unknown>> = {};
  for (const field of IMPORT_FIELDS) {
    const result = PARSERS[field.type](row.cells[field.id] ?? '', context);
    if ('error' in result) problems.push({ field: field.id, message: result.error });
    else record[FIELD_KEY[field.id]] = result.value;
  }
  return problems.length > 0 ? { problems } : { record: record as unknown as ValidRecord };
};

/** Every row checked: the ones ready to import, and the ones with problems (row number and what's wrong). */
export const previewImport = (rows: readonly ImportRow[], context: ImportContext) => {
  const ready: ImportRow[] = [];
  const invalid: { row: number; problems: RowProblem[] }[] = [];
  for (const row of rows) {
    const result = validateImportRow(row, context);
    if ('record' in result) ready.push(row);
    else invalid.push({ row: row.row, problems: result.problems });
  }
  return { ready, invalid };
};
