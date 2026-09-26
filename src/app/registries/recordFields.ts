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
