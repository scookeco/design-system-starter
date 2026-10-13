import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { evaluate, parse, type Value } from './expression';
import type { DocumentLifecycle } from './documentIndex';

/** A document's captured values by name. A Repeat's rows are a list of objects under its name. */
export type DocumentValues = Readonly<Record<string, unknown>>;

/** The row a field or computed value is in, inside a Repeat: its values are `items.2.*`. */
export interface RowScope {
  repeat: string;
  index: number;
}

interface ComputedEntry {
  formula: string;
  /** The Repeat it is computed per row of, or null for the document. */
  repeat: string | null;
}

export interface DocumentData {
  values: DocumentValues;
  /** Live inputs (filled, negotiated) or values as text (generated, executed). */
  editable: boolean;
  /** The currency of currency fields and computed amounts. */
  currency: string;
  printMode: 'all' | 'resolved';
  /** The party acting now (`actor` on the Document): only its fields are editable. Null: every field. */
  actor: string | null;
  setValue: (path: string, value: unknown) => void;
  /** What a name means here: a row's value, a field, a computed value, or a list through rows. */
  lookup: (path: readonly string[], row: RowScope | null) => Value;
  registerComputed: (key: string, entry: ComputedEntry) => () => void;
  /** Says a field filled, for the viewer's live region (DocumentViewer provides it). */
  announce: (message: string) => void;
}

const noop = () => undefined;

export const DocumentDataContext = createContext<DocumentData | null>(null);

/** The Repeat row a part is in, if any. */
export const RowContext = createContext<RowScope | null>(null);

/** True inside a Conditional that is off: its fields are disabled and not required. */
export const HiddenContext = createContext(false);

/** The party role that fields inherit (a Fieldset's or a RoleRegion's `role`). */
export const RoleContext = createContext<string | null>(null);

/** The viewer's live region, for announcing fields that fill. DocumentViewer provides it. */
export const AnnounceContext = createContext<(message: string) => void>(noop);

const read = (source: unknown, path: readonly string[]): unknown => {
  let at = source;
  for (const key of path) {
    if (at === null || typeof at !== 'object') return undefined;
    at = (at as Record<string, unknown>)[key];
  }
  return at;
};

const write = (source: unknown, path: readonly string[], value: unknown): unknown => {
  const [key, ...rest] = path;
  if (key === undefined) return value;
  const index = Number(key);
  if (Array.isArray(source) || (Number.isInteger(index) && String(index) === key)) {
    const copy = Array.isArray(source) ? [...(source as unknown[])] : [];
    copy[index] = write(copy[index], rest, value);
    return copy;
  }
  const object = source !== null && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  return { ...object, [key]: write(object[key], rest, value) };
};

/** The full path of a name in a row ("items.2.qty") or in the document ("employer_name"). */
export const fullName = (name: string, row: RowScope | null) => (row ? `${row.repeat}.${String(row.index)}.${name}` : name);

const toValue = (v: unknown): Value => {
  if (v === undefined) return null;
  if (Array.isArray(v)) return v.map(toValue);
  if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  return null;
};

export interface DocumentDataProviderProps {
  lifecycle: DocumentLifecycle;
  values?: DocumentValues;
  defaultValues?: DocumentValues;
  onValuesChange?: (values: DocumentValues) => void;
  currency: string;
  printMode: 'all' | 'resolved';
  actor?: string;
  children: ReactNode;
}

/** Holds a Document's values (controlled with `values`, or its own from `defaultValues`) and its computed formulas. */
export function DocumentDataProvider({ lifecycle, values: controlled, defaultValues, onValuesChange, currency, printMode, actor, children }: DocumentDataProviderProps) {
  const [own, setOwn] = useState<DocumentValues>(defaultValues ?? {});
  const values = controlled ?? own;
  const latest = useRef(values);
  latest.current = values;
  const [computed, setComputed] = useState<ReadonlyMap<string, ComputedEntry>>(new Map());
  const announce = useContext(AnnounceContext);

  const setValue = useCallback(
    (path: string, value: unknown) => {
      const next = write(latest.current, path.split('.'), value) as DocumentValues;
      latest.current = next;
      if (controlled === undefined) setOwn(next);
      onValuesChange?.(next);
    },
    [controlled, onValuesChange],
  );

  const registerComputed = useCallback((key: string, entry: ComputedEntry) => {
    setComputed((map) => new Map(map).set(key, entry));
    return () =>
      setComputed((map) => {
        const next = new Map(map);
        next.delete(key);
        return next;
      });
  }, []);

  const lookup = useMemo(() => {
    const evaluating = new Set<string>();
    const run = (key: string, entry: ComputedEntry, row: RowScope | null): Value => {
      const id = `${key}@${row ? String(row.index) : ''}`;
      if (evaluating.has(id)) return null; // a formula that reads itself
      evaluating.add(id);
      try {
        return evaluate(parse(entry.formula), (path) => resolve(path, row));
      } finally {
        evaluating.delete(id);
      }
    };
    const rowsOf = (repeat: string) => {
      const rows = read(values, [repeat]);
      return Array.isArray(rows) ? rows : [];
    };
    const resolve = (path: readonly string[], row: RowScope | null): Value => {
      const [head = '', ...rest] = path;
      if (row) {
        const rowComputed = computed.get(`${row.repeat}.*.${head}`);
        if (rowComputed && !rest.length) return run(`${row.repeat}.*.${head}`, rowComputed, row);
        const inRow = read(values, [row.repeat, String(row.index), head]);
        if (inRow !== undefined) return toValue(read(inRow, rest));
      }
      const docComputed = computed.get(head);
      if (docComputed && !rest.length) return run(head, docComputed, null);
      const top = read(values, [head]);
      const isRepeat = Array.isArray(top) || [...computed.values()].some((e) => e.repeat === head);
      if (isRepeat) {
        if (!rest.length) return toValue(top);
        return rowsOf(head).map((_, index) => resolve(rest, { repeat: head, index }));
      }
      return toValue(read(top, rest));
    };
    return resolve;
  }, [values, computed]);

  const data = useMemo<DocumentData>(
    () => ({
      values,
      editable: lifecycle === 'filled' || lifecycle === 'negotiated',
      currency,
      printMode,
      actor: actor ?? null,
      setValue,
      lookup: (path, row) => (path.length === 1 && path[0] === 'lifecycle' ? lifecycle : lookup(path, row)),
      registerComputed,
      announce,
    }),
    [values, lifecycle, currency, printMode, actor, setValue, lookup, registerComputed, announce],
  );
  return <DocumentDataContext value={data}>{children}</DocumentDataContext>;
}

/** The document's data, or a static stand-in outside a Document (fields then show blanks). */
export function useDocumentData(): DocumentData {
  const data = useContext(DocumentDataContext);
  return (
    data ?? {
      values: {},
      editable: false,
      currency: 'USD',
      printMode: 'all',
      actor: null,
      setValue: noop,
      lookup: () => null,
      registerComputed: () => noop,
      announce: noop,
    }
  );
}

/** A field's value and setter, by its name in the current row. */
export function useField(name: string) {
  const data = useDocumentData();
  const row = useContext(RowContext);
  const path = fullName(name, row);
  const value = read(data.values, path.split('.'));
  const set = useCallback((next: unknown) => data.setValue(path, next), [data, path]);
  return { data, row, path, value, set };
}

/**
 * Who fills a capture element and whether it can now: its own `role`, else the enclosing fieldset's
 * or role region's; editable while the document is, by the acting party only (when there is one),
 * and never inside a Conditional that is off.
 */
export function useCapture(role: string | undefined) {
  const data = useDocumentData();
  const inherited = useContext(RoleContext);
  const hidden = useContext(HiddenContext);
  const resolved = role ?? inherited ?? undefined;
  const mine = data.actor === null || resolved === undefined || resolved === data.actor;
  return { role: resolved, hidden, editable: data.editable && mine };
}

/** Registers a computed formula while it is mounted. */
export function useRegisterComputed(name: string, formula: string) {
  const { registerComputed } = useDocumentData();
  const row = useContext(RowContext);
  const key = row ? `${row.repeat}.*.${name}` : name;
  const repeat = row?.repeat ?? null;
  useEffect(() => registerComputed(key, { formula, repeat }), [registerComputed, key, formula, repeat]);
}
