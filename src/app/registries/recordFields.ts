/**
 * Which fields a record has, and in what order: config, not markup. The record page's properties
 * rail and the create form both render from here through the field registry.
 */
import type { RecordEntity } from '../api/schemas';
import type { FieldDef, FieldType } from './fields';

/** The properties rail on the record page. */
export const RECORD_PROPERTIES: readonly FieldDef<RecordEntity>[] = [
  { type: 'person', id: 'owner', label: 'Owner', get: (r) => r.ownerId },
  { type: 'account', id: 'account', label: 'Account', get: (r) => r.accountId },
  { type: 'status', id: 'status', label: 'Status', get: (r) => r.status },
  { type: 'money', id: 'amount', label: 'Amount', get: (r) => r.amount },
  { type: 'date', id: 'renewsOn', label: 'Renews on', get: (r) => r.renewsOn },
  { type: 'date', id: 'updatedAt', label: 'Last updated', get: (r) => r.updatedAt },
  { type: 'tags', id: 'tags', label: 'Tags', get: (r) => r.tags },
  { type: 'text', id: 'id', label: 'ID', get: (r) => r.id },
];

/** A form field: its type, the draft key it edits, and its label. */
export interface FormFieldDef<Key extends string> {
  type: FieldType;
  id: Key;
  label: string;
}

/** The create form's registry-rendered fields, per card, in order. */
export const CREATE_FIELDS = {
  details: [
    { type: 'text', id: 'name', label: 'Name' },
    { type: 'person', id: 'owner', label: 'Owner' },
    { type: 'account', id: 'account', label: 'Account (optional)' },
  ],
  terms: [{ type: 'money', id: 'amount', label: 'Amount' }],
} as const satisfies Record<string, readonly FormFieldDef<string>[]>;

/** The fields the edit form changes: what a conflict is compared on, field by field (src/app/model/conflicts.ts). */
export const EDIT_FIELDS = [
  { type: 'text', id: 'name', label: 'Name', get: (r: RecordEntity) => r.name },
  { type: 'person', id: 'owner', label: 'Owner', get: (r: RecordEntity) => r.ownerId },
  { type: 'account', id: 'account', label: 'Account', get: (r: RecordEntity) => r.accountId },
  { type: 'money', id: 'amount', label: 'Amount', get: (r: RecordEntity) => r.amount },
] as const satisfies readonly FieldDef<RecordEntity>[];
export type EditFieldId = (typeof EDIT_FIELDS)[number]['id'];

/** The tags a person can put on a record from its page. Legal hold isn't one: legal sets and lifts it. */
export const TAG_OPTIONS = ['priority', 'renewal', 'vendor', 'customer', 'internal'] as const;

/**
 * The fields a CSV import can fill, in the order the mapping step lists them: config, like the
 * create form's. Each type's cell parser lives beside the import rules (src/app/model/imports.ts),
 * keyed on the same FieldType union, so a new importable type fails to compile until it has one.
 * `aliases` are column names a spreadsheet might use for it; the mapping step pre-selects a match.
 */
export const IMPORT_FIELDS = [
  { type: 'text', id: 'name', label: 'Name', required: true, aliases: ['name', 'title', 'record', 'record name'] },
  { type: 'person', id: 'owner', label: 'Owner', required: false, aliases: ['owner', 'owner email', 'assignee'] },
  { type: 'account', id: 'account', label: 'Account', required: false, aliases: ['account', 'customer', 'company'] },
  { type: 'status', id: 'status', label: 'Status', required: false, aliases: ['status', 'stage'] },
  { type: 'money', id: 'amount', label: 'Amount', required: false, aliases: ['amount', 'value', 'contract value'] },
  { type: 'date', id: 'renewsOn', label: 'Renews on', required: false, aliases: ['renews on', 'renewal date', 'renews'] },
] as const satisfies readonly (FormFieldDef<string> & { required: boolean; aliases: readonly string[] })[];
export type ImportFieldId = (typeof IMPORT_FIELDS)[number]['id'];
