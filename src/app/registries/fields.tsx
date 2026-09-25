/**
 * The field registry: one entry per field type, each knowing how to show a value and how to edit
 * one. A record page's properties and a create form's fields are both rendered from field
 * definitions through this registry, so a new field is a line of config and a new field type is
 * one registry entry, never a new branch in a page.
 *
 * Two safety nets, and both are needed:
 *  - compile time: the registry is keyed on the FieldType union, so a type with no entry fails
 *    to compile;
 *  - run time: a definition whose type the registry doesn't know (data newer than the code, a
 *    schema from elsewhere) renders a placeholder and is reported. It never throws.
 */
import type { ReactNode } from 'react';
import { Avatar, Badge, Cluster, Select, Tag, Text, TextField, type Formatter } from '../../index';
import { RECORD_STATUSES, type Money, type Person, type RecordStatus } from '../api/schemas';
import { STATUS } from '../model/status';

export const FIELD_TYPES = ['text', 'money', 'date', 'status', 'person', 'tags'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** What a field of each type holds, confirmed, from the cache. */
export interface FieldValues {
  text: string;
  money: Money;
  /** A calendar date (2026-09-30) or an instant (ISO 8601 with zone). */
  date: string;
  status: RecordStatus;
  person: Person;
  tags: readonly string[];
}

/** What a field of each type holds while someone is typing it: form state, as entered. */
export interface DraftValues {
  text: string;
  /** Major units, as typed ("12500.50"). */
  money: string;
  date: string;
  status: RecordStatus | '';
  /** A person's id. */
  person: string;
  /** Comma-separated. */
  tags: string;
}

/** What an input needs from the page beyond its own value. */
export interface FieldContext {
  format: Formatter;
  /** The workspace's currency, for money inputs. */
  currency: string;
  /** Choices for person inputs. */
  people: readonly Person[];
}

export interface FieldInputProps<K extends FieldType> {
  id: string;
  label: string;
  value: DraftValues[K];
  onChange: (value: DraftValues[K]) => void;
  onBlur?: () => void;
  error?: string | undefined;
  context: FieldContext;
}

export interface FieldEntry<K extends FieldType> {
  /** Align in tables and property lists like a number (tabular figures). */
  numeric: boolean;
  display: (value: FieldValues[K], context: Pick<FieldContext, 'format'>) => ReactNode;
  input: (props: FieldInputProps<K>) => ReactNode;
}

/** One entry per field type. Leave one out and this stops compiling. */
export type FieldRegistry = { [K in FieldType]: FieldEntry<K> };

export const FIELD_REGISTRY: FieldRegistry = {
  text: {
    numeric: false,
    display: (value) => value,
    input: ({ id, label, value, onChange, onBlur, error }) => (
      <TextField id={id} label={label} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} error={error} autoComplete="off" />
    ),
  },
  money: {
    numeric: true,
    display: (value, { format }) => format.money(value.minor, value.currency),
    input: ({ id, label, value, onChange, onBlur, error, context }) => (
      <TextField
        id={id}
        label={`${label} (${context.currency})`}
        type="number"
        inputMode="decimal"
        min={0}
        // Any number of decimals: otherwise the browser blocks "12500.50" as a step mismatch.
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        error={error}
      />
    ),
  },
  date: {
    numeric: true,
    display: (value, { format }) => format.date(value),
    input: ({ id, label, value, onChange, onBlur, error }) => (
      // TextField has no date type yet (a date picker is its own component); ISO text until then.
      <TextField id={id} label={label} description="As YYYY-MM-DD, for example 2027-01-31." value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} error={error} />
    ),
  },
  status: {
    numeric: false,
    display: (value) => <Badge tone={STATUS[value].tone}>{STATUS[value].label}</Badge>,
    input: ({ id, label, value, onChange, error }) => (
      <Select
        id={id}
        label={label}
        options={RECORD_STATUSES.map((status) => ({ value: status, label: STATUS[status].label }))}
        value={value}
        onValueChange={(next) => onChange(next as RecordStatus)}
        error={error}
      />
    ),
  },
  person: {
    numeric: false,
    display: (value) => (
      <Cluster gap="xs" align="center" wrap={false}>
        <Avatar name={value.name} size="sm" decorative />
        {value.name}
      </Cluster>
    ),
    input: ({ id, label, value, onChange, onBlur, error, context }) => (
      <Select
        id={id}
        label={label}
        placeholder={context.people.length === 0 ? 'Loading people…' : 'Choose a person'}
        options={context.people.map((person) => ({ value: person.id, label: person.name }))}
        value={value}
        onValueChange={(next) => {
          onChange(next);
          onBlur?.();
        }}
        error={error}
      />
    ),
  },
  tags: {
    numeric: false,
    display: (value) =>
      value.length === 0 ? (
        <Text as="span" tone="muted">
          None
        </Text>
      ) : (
        <Cluster gap="2xs">
          {value.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Cluster>
      ),
    input: ({ id, label, value, onChange, onBlur, error }) => (
      <TextField
        id={id}
        label={label}
        description="Separate tags with commas."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        error={error}
      />
    ),
  },
};

/**
 * A field of some entity: its type, its label, and where its value comes from. The union over
 * FieldType ties `get` to the type, so a money field can't read a string.
 */
export type FieldDef<Entity> = {
  [K in FieldType]: { type: K; id: string; label: string; get: (entity: Entity) => FieldValues[K] };
}[FieldType];

/** Where unknown field types are reported. An app points this at its error tracker; tests replace it. */
export const fieldReporting = {
  report: (type: string, fieldId: string) => {
    console.warn(`No registry entry for field type "${type}" (field "${fieldId}"). Rendered a placeholder.`);
  },
};

/** Report each unknown type and field once, however often it renders. */
const reported = new Set<string>();
const reportOnce = (type: string, fieldId: string) => {
  const key = `${type}|${fieldId}`;
  if (reported.has(key)) return;
  reported.add(key);
  fieldReporting.report(type, fieldId);
};

/** The registry entry for a type, or undefined when the data names a type this code doesn't know. */
const entryFor = (type: string): FieldEntry<FieldType> | undefined =>
  (FIELD_REGISTRY as Partial<Record<string, FieldEntry<FieldType>>>)[type];

/** Shown in place of a field whose type is unknown: honest, and never a crash. */
const Unavailable = () => (
  <Text as="span" tone="muted">
    Not available
  </Text>
);

export interface FieldDisplayProps<Entity> {
  field: FieldDef<Entity>;
  entity: Entity;
  format: Formatter;
}

/** One field's value, rendered by its registry entry. */
export function FieldDisplay<Entity>({ field, entity, format }: FieldDisplayProps<Entity>) {
  const entry = entryFor(field.type);
  if (!entry) {
    reportOnce(field.type, field.id);
    return <Unavailable />;
  }
  return <>{(entry.display as (value: unknown, context: { format: Formatter }) => ReactNode)(field.get(entity), { format })}</>;
}

/** Whether a field's value aligns like a number. False for unknown types. */
export const isNumericField = (type: string) => entryFor(type)?.numeric ?? false;

/** A form field for a definition's type. Drafts are keyed by field id. */
export interface FieldInputRenderProps {
  field: { type: FieldType | (string & {}); id: string; label: string };
  inputId: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | undefined;
  context: FieldContext;
}

export function FieldInput({ field, inputId, value, onChange, onBlur, error, context }: FieldInputRenderProps) {
  const entry = entryFor(field.type);
  if (!entry) {
    reportOnce(field.type, field.id);
    return (
      <Text>
        {`${field.label}: `}
        <Unavailable />
      </Text>
    );
  }
  // Every draft value is a string at this seam; each entry narrows it for its own type.
  const input = entry.input as (props: FieldInputProps<FieldType>) => ReactNode;
  return <>{input({ id: inputId, label: field.label, value: value as DraftValues[FieldType], onChange: onChange as (v: DraftValues[FieldType]) => void, onBlur, error, context })}</>;
}
