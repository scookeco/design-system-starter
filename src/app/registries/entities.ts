/**
 * Schemas decide which fields exist: entityType → fields. One config per entity says what its list
 * shows, what its record page's properties are, which records relate to it, and what its form
 * edits; the generic list, record and form pages render any of them through the field registry.
 * A new entity that fits these surfaces is a new entry here (plus its schema, endpoints and cache),
 * not a new page.
 *
 * The record entity keeps its hand-built golden pages (src/examples/RecordPage.tsx and
 * CreateEditFlow.tsx), which read their fields from recordFields.ts through the same registry.
 */
import type { UseQueryResult } from '@tanstack/react-query';
import type { AccountInput } from '../api/accounts';
import type { Account, Capability, Person, RecordFilter } from '../api/schemas';
import { useCreateAccount, useUpdateAccount } from '../model/mutations';
import { useAccount, useAccounts, usePeople, usePerson } from '../model/queries';
import type { FieldDef, FieldType } from './fields';

/** A form field: its registry type, the draft key it edits, its label, and how its text is checked. */
export interface EntityFormField {
  type: FieldType;
  id: string;
  label: string;
  /** The error for a value, or undefined when it's fine. Runs on blur and on submit. */
  validate?: (value: string) => string | undefined;
}

/** A form's state: every field as typed, keyed by field id. */
export type EntityDraft = Readonly<Record<string, string>>;

/** How an entity is saved: create when there's no existing entity, update otherwise. */
export interface EntitySave<E> {
  save: (draft: EntityDraft, options: { idempotencyKey: string; onSuccess: (saved: E) => void }) => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

export interface EntityConfig<E extends { id: string }> {
  label: { one: string; many: string };
  /** The list's path; a record is `${path}/${id}`. Also the nav item its pages sit under. */
  path: string;
  /** What the list page says it holds. */
  description: string;
  title: (entity: E) => string;
  capabilities: { read: Capability; create?: Capability; edit?: Capability };
  /** The list's columns after the title column. */
  columns: readonly FieldDef<E>[];
  /** The record page's properties rail. */
  properties: readonly FieldDef<E>[];
  /** Records that point at this entity by id: the record page lists them, with rollups. */
  related?: { title: string; filter: (entity: E) => Pick<RecordFilter, 'account' | 'owner'> };
  /** The create and edit form. Absent: the entity has no form page. */
  form?: {
    fields: readonly EntityFormField[];
    /** An existing entity as a draft, for editing. */
    toDraft: (entity: E, currencyDigits: number) => EntityDraft;
    useSave: (existing: E | undefined, currencyDigits: number) => EntitySave<E>;
  };
  useList: () => UseQueryResult<E[]>;
  useOne: (id: string) => UseQueryResult<E | undefined>;
}

const required = (message: string) => (value: string) => (value.trim() === '' ? message : undefined);
const isoDate = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value.trim()) && !Number.isNaN(Date.parse(value)) ? undefined : 'Enter a date as YYYY-MM-DD, for example 2024-03-01.');
const amount = (value: string) => {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? undefined : 'Enter an amount of 0 or more, for example 120000.';
};

/** A draft as the account endpoints take it: money as integer minor units. */
const toAccountInput = (draft: EntityDraft, digits: number): AccountInput => ({
  name: (draft.name ?? '').trim(),
  domain: (draft.domain ?? '').trim(),
  industry: (draft.industry ?? '').trim(),
  ownerId: draft.owner ?? '',
  arrMinor: Math.round(Number(draft.arr ?? '0') * 10 ** digits),
  customerSince: (draft.customerSince ?? '').trim(),
});

function useSaveAccount(existing: Account | undefined, digits: number): EntitySave<Account> {
  const create = useCreateAccount();
  const update = useUpdateAccount(existing?.id ?? '');
  const active = existing ? update : create;
  return {
    save: (draft, { idempotencyKey, onSuccess }) => {
      const input = toAccountInput(draft, digits);
      if (existing) update.mutate({ changes: input, version: existing.version }, { onSuccess });
      else create.mutate({ account: input, idempotencyKey }, { onSuccess });
    },
    isPending: active.isPending,
    isError: active.isError,
    error: active.error,
  };
}

export const ACCOUNT: EntityConfig<Account> = {
  label: { one: 'Account', many: 'Accounts' },
  path: '/accounts',
  description: 'The customers your records belong to, and who owns each relationship.',
  title: (a) => a.name,
  capabilities: { read: 'account:read', create: 'account:create', edit: 'account:edit' },
  columns: [
    { type: 'text', id: 'industry', label: 'Industry', get: (a) => a.industry },
    { type: 'person', id: 'owner', label: 'Owner', get: (a) => a.ownerId },
    { type: 'money', id: 'arr', label: 'Annual revenue', get: (a) => a.arr },
  ],
  properties: [
    { type: 'person', id: 'owner', label: 'Owner', get: (a) => a.ownerId },
    { type: 'text', id: 'industry', label: 'Industry', get: (a) => a.industry },
    { type: 'text', id: 'domain', label: 'Domain', get: (a) => a.domain },
    { type: 'money', id: 'arr', label: 'Annual revenue', get: (a) => a.arr },
    { type: 'date', id: 'customerSince', label: 'Customer since', get: (a) => a.customerSince },
    { type: 'text', id: 'id', label: 'ID', get: (a) => a.id },
  ],
  related: { title: 'Records', filter: (a) => ({ account: a.id }) },
  form: {
    fields: [
      { type: 'text', id: 'name', label: 'Name', validate: required('Enter the account’s name.') },
      { type: 'text', id: 'domain', label: 'Domain', validate: required('Enter the account’s web domain, for example northwind.example.') },
      { type: 'text', id: 'industry', label: 'Industry', validate: required('Enter an industry, for example Retail.') },
      { type: 'person', id: 'owner', label: 'Owner', validate: required('Choose who owns this relationship.') },
      { type: 'money', id: 'arr', label: 'Annual revenue', validate: amount },
      { type: 'date', id: 'customerSince', label: 'Customer since', validate: isoDate },
    ],
    toDraft: (a, digits) => ({
      name: a.name,
      domain: a.domain,
      industry: a.industry,
      owner: a.ownerId,
      arr: String(a.arr.minor / 10 ** digits),
      customerSince: a.customerSince,
    }),
    useSave: useSaveAccount,
  },
  useList: useAccounts,
  useOne: useAccount,
};

export const PERSON: EntityConfig<Person> = {
  label: { one: 'Person', many: 'People' },
  path: '/people',
  description: 'Everyone in the workspace who can own records and accounts.',
  title: (p) => p.name,
  capabilities: { read: 'record:read' },
  columns: [{ type: 'text', id: 'email', label: 'Email', get: (p) => p.email }],
  properties: [
    { type: 'text', id: 'email', label: 'Email', get: (p) => p.email },
    { type: 'text', id: 'id', label: 'ID', get: (p) => p.id },
  ],
  related: { title: 'Records they own', filter: (p) => ({ owner: p.id }) },
  useList: usePeople,
  useOne: usePerson,
};

/** entityType → config. The route table and the generic pages look entities up here. */
export const ENTITIES = { account: ACCOUNT, person: PERSON } as const;
export type EntityType = keyof typeof ENTITIES;
