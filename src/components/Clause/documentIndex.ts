import { createContext, useLayoutEffect, useState, type RefObject } from 'react';
import type { HeadingLevel } from '../Heading/Heading';

/** Where a clause sits: what it shows beside its heading ("3.1", "(a)") and how a reference names it ("3.1(a)"). */
export interface ClausePosition {
  number: string;
  ref: string;
  /** Another clause or exhibit in the same document has this id. */
  duplicate: boolean;
  /** The id of the Exhibit the clause is in, or null in the body of the document. */
  exhibit: string | null;
}

/** An exhibit attached to the document: lettered A, B, C… in the order attached. */
export interface ExhibitPosition {
  letter: string;
  duplicate: boolean;
}

/** What a document's clauses and defined terms resolve to, read from the rendered paper. */
export interface DocumentIndex {
  /** False until the paper has been read once: nothing is flagged as missing before then. */
  ready: boolean;
  clauses: Readonly<Record<string, ClausePosition>>;
  exhibits: Readonly<Record<string, ExhibitPosition>>;
  /** How many times each defined term is defined (normalised name → count). */
  terms: Readonly<Record<string, number>>;
}

/** The document a Clause, ClauseRef or Term is inside: its id scope, outline level and index. */
export interface DocumentScope {
  scope: string;
  headingLevel: HeadingLevel;
  /** How a reference from an exhibit names the body of the document ("the Agreement"). */
  documentName: string;
  index: DocumentIndex;
}

export const DocumentScopeContext = createContext<DocumentScope | null>(null);

/** How deep the enclosing clause is (0 outside any clause). */
export const ClauseDepthContext = createContext(0);

/** The id of the Exhibit a clause or reference is inside (null in the body of the document). */
export const ExhibitContext = createContext<string | null>(null);

const EMPTY: DocumentIndex = { ready: false, clauses: {}, terms: {}, exhibits: {} };

/** A term's identity: case and spacing don't matter ("Confidential  information" = "confidential information"). */
export const termKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** A DOM id unique to this document, so two documents on one page never share one. */
export const scopedId = (scope: string, kind: 'clause' | 'term', key: string) =>
  `${scope}-${kind}-${key.replace(/[^a-z0-9_-]+/gi, '-')}`;

const letter = (n: number) => {
  let out = '';
  for (let rest = n; rest > 0; rest = Math.floor((rest - 1) / 26)) out = String.fromCharCode(97 + ((rest - 1) % 26)) + out;
  return out;
};

const ROMAN: readonly [number, string][] = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
const roman = (n: number) => {
  let out = '';
  let rest = n;
  for (const [value, digits] of ROMAN) {
    while (rest >= value) {
      out += digits;
      rest -= value;
    }
  }
  return out;
};

/** 1 → "3." / "3"; 2 → "3.1"; 3 → "(a)" / "3.1(a)"; 4 → "(i)" / "3.1(a)(i)". */
function position(counters: readonly number[]): { number: string; ref: string } {
  const [first = 0, second, ...rest] = counters;
  let ref = String(first);
  let number = `${first}.`;
  if (second !== undefined) {
    ref = `${first}.${second}`;
    number = ref;
  }
  rest.forEach((n, i) => {
    const part = `(${i === 0 ? letter(n) : roman(n)})`;
    ref += part;
    number = part;
  });
  return { number, ref };
}

function read(root: HTMLElement): DocumentIndex {
  const exhibits: Record<string, ExhibitPosition> = {};
  [...root.querySelectorAll<HTMLElement>('[data-exhibit]')].forEach((el, i) => {
    const id = el.dataset.exhibit ?? '';
    const existing = exhibits[id];
    if (existing) existing.duplicate = true;
    else exhibits[id] = { letter: letter(i + 1).toUpperCase(), duplicate: false };
  });
  const clauses: Record<string, ClausePosition> = {};
  // Numbering restarts in each exhibit: one set of counters per scope (the body is '').
  const counters = new Map<string, number[]>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-clause]')) {
    const depth = Number(el.dataset.depth);
    const id = el.dataset.clause ?? '';
    const exhibit = el.closest<HTMLElement>('[data-exhibit]')?.dataset.exhibit ?? null;
    const scoped = counters.get(exhibit ?? '') ?? [];
    counters.set(exhibit ?? '', scoped);
    scoped.length = depth;
    scoped[depth - 1] = (scoped[depth - 1] ?? 0) + 1;
    const existing = clauses[id];
    if (existing) existing.duplicate = true;
    else clauses[id] = { ...position(scoped), duplicate: id in exhibits, exhibit };
  }
  const terms: Record<string, number> = {};
  for (const el of root.querySelectorAll<HTMLElement>('dfn[data-term]')) {
    const key = el.dataset.term ?? '';
    terms[key] = (terms[key] ?? 0) + 1;
  }
  return { ready: true, clauses, terms, exhibits };
}

/**
 * Reads the paper's clauses (in document order, by nesting depth) and defined terms after every
 * change to it, so numbers and references follow whatever the document holds now: add, remove or
 * move a clause and everything renumbers. Writes back only when something changed.
 */
export function useDocumentIndex(root: RefObject<HTMLElement | null>): DocumentIndex {
  const [index, setIndex] = useState<DocumentIndex>(EMPTY);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    let last = '';
    const update = () => {
      const next = read(el);
      const key = JSON.stringify(next);
      if (key === last) return;
      last = key;
      setIndex(next);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [root]);
  return index;
}
