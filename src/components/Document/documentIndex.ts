import { createContext, useLayoutEffect, useState, type MouseEvent, type RefObject } from 'react';
import type { HeadingLevel } from '../Heading/Heading';

/**
 * Where a clause sits: the number CSS draws beside its heading ("3.1", "(a)") and how a reference
 * names it ("3.1(a)"). The index computes the same numbers the counters draw (Clause.css), for
 * references, the table of contents and tooling; a browser test holds the two in agreement.
 */
export interface ClausePosition {
  /** Empty for an unnumbered clause or section: references name it by its title. */
  number: string;
  ref: string;
  /** The heading's text, without the number. Empty for an untitled clause. */
  title: string;
  depth: number;
  /** Another clause, section, exhibit or definition in the same document has this id. */
  duplicate: boolean;
  /** The id of the Exhibit the clause is in, or null in the body of the document. */
  exhibit: string | null;
}

/** An exhibit attached to the document: lettered A, B, C… in the order attached, unless it has a label. */
export interface ExhibitPosition {
  letter: string;
  title: string;
  duplicate: boolean;
}

/** A defined term: how many times it is defined (once is right) and its text. */
export interface TermPosition {
  text: string;
  count: number;
}

/** One entry of the document's outline, in document order: what a table of contents lists. */
export interface OutlineEntry {
  id: string;
  kind: 'clause' | 'exhibit';
}

/** What a document's clauses, exhibits and defined terms resolve to, read from the rendered document. */
export interface DocumentIndex {
  /** False until the document has been read once: nothing is flagged as missing before then. */
  ready: boolean;
  clauses: Readonly<Record<string, ClausePosition>>;
  exhibits: Readonly<Record<string, ExhibitPosition>>;
  /** Defined terms by id ("def-customer"). */
  terms: Readonly<Record<string, TermPosition>>;
  outline: readonly OutlineEntry[];
}

/** How a document is laid out: flow reflows (contracts, letters); grid places on fixed pages (forms). */
export type DocumentShell = 'flow' | 'grid';

/** Where a document is in its life: generated from data, filled in, negotiated (redlines), or executed (signed). */
export type DocumentLifecycle = 'generated' | 'filled' | 'negotiated' | 'executed';

/** The document a Clause, Xref or Term is inside: its id scope, outline level and index. */
export interface DocumentScope {
  scope: string;
  shell: DocumentShell;
  lifecycle: DocumentLifecycle;
  headingLevel: HeadingLevel;
  /** How a reference from an exhibit names the body of the document ("the Agreement"). */
  documentName: string;
  index: DocumentIndex;
}

export const DocumentScopeContext = createContext<DocumentScope | null>(null);

/** How deep the enclosing numbered clause is (0 outside any clause): sets the clause's number format. */
export const ClauseDepthContext = createContext(0);

/** How many sections, unnumbered, enclose this: each puts headings one level deeper without touching numbers. */
export const SectionDepthContext = createContext(0);

/** The id of the Exhibit a clause or reference is inside (null in the body of the document). */
export const ExhibitContext = createContext<string | null>(null);

const EMPTY: DocumentIndex = { ready: false, clauses: {}, terms: {}, exhibits: {}, outline: [] };

/** A term's identity: case and spacing don't matter ("Confidential  information" = "confidential information"). */
export const termKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** The id a defined term gets when none is given: "Confidential Information" → "def-confidential-information". */
export const termId = (name: string) => `def-${termKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/** A DOM id unique to this document, so two documents on one page never share one. */
export const scopedId = (scope: string, kind: 'clause' | 'term', key: string) =>
  `${scope}-${kind}-${key.replace(/[^a-z0-9_-]+/gi, '-')}`;

/** Follows a link inside a document: focus moves to the target (with scroll padding clear of sticky content). */
export const jumpTo = (event: MouseEvent<HTMLAnchorElement>, target: string) => {
  const element = event.currentTarget.ownerDocument.getElementById(target);
  if (!element) return;
  event.preventDefault();
  element.tabIndex = -1;
  element.focus();
};

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

/** 1 → "3." / "3"; 2 → "3.1"; 3 → "(a)" / "3.1(a)"; 4 → "(i)" / "3.1(a)(i)": what Clause.css's counters draw. */
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

/** Hidden content (a Conditional that is off) takes no number, as `display: none` takes no counter. */
const shown = (el: Element) => !el.closest('[hidden]');

/** The heading's own text: the number is generated content, so textContent is the title alone. */
const titleOf = (el: Element) => el.querySelector(':scope > :is(h1, h2, h3, h4, h5, h6)')?.textContent?.trim() ?? '';

function read(root: HTMLElement): DocumentIndex {
  const ids = new Set<string>();
  const seen = (id: string) => {
    const again = ids.has(id);
    ids.add(id);
    return again;
  };
  const exhibits: Record<string, ExhibitPosition> = {};
  const clauses: Record<string, ClausePosition> = {};
  const outline: OutlineEntry[] = [];
  // Numbering restarts in each exhibit: one set of counters per scope (the body is '').
  const counters = new Map<string, number[]>();
  let exhibitCount = 0;
  for (const el of root.querySelectorAll<HTMLElement>('[data-exhibit], [data-clause]')) {
    if (!shown(el)) continue;
    if (el.dataset.exhibit !== undefined) {
      const id = el.dataset.exhibit;
      exhibitCount += 1;
      const twice = seen(id);
      const existing = exhibits[id];
      if (existing) existing.duplicate = true;
      else {
        exhibits[id] = { letter: el.dataset.label ?? letter(exhibitCount).toUpperCase(), title: el.dataset.title ?? '', duplicate: twice };
        outline.push({ id, kind: 'exhibit' });
      }
      continue;
    }
    const id = el.dataset.clause ?? '';
    const depth = Number(el.dataset.depth);
    const exhibit = el.closest<HTMLElement>('[data-exhibit]')?.dataset.exhibit ?? null;
    let at = { number: '', ref: '' };
    if (el.dataset.unnumbered === undefined) {
      const scoped = counters.get(exhibit ?? '') ?? [];
      counters.set(exhibit ?? '', scoped);
      scoped.length = depth;
      scoped[depth - 1] = (scoped[depth - 1] ?? 0) + 1;
      at = position(scoped);
    }
    const twice = seen(id);
    const existing = clauses[id];
    if (existing) existing.duplicate = true;
    else {
      clauses[id] = { ...at, title: titleOf(el), depth, duplicate: twice, exhibit };
      outline.push({ id, kind: 'clause' });
    }
  }
  const terms: Record<string, TermPosition> = {};
  for (const el of root.querySelectorAll<HTMLElement>('dfn[data-term]')) {
    if (!shown(el)) continue;
    const id = el.dataset.term ?? '';
    const existing = terms[id];
    if (existing) existing.count += 1;
    else terms[id] = { text: el.textContent?.trim() ?? '', count: ids.has(id) ? 2 : 1 };
  }
  return { ready: true, clauses, terms, exhibits, outline };
}

/**
 * Reads the document's clauses (in document order, by nesting depth), exhibits and defined terms
 * after every change to it, so numbers and references follow whatever the document holds now: add,
 * remove, hide or move a clause and everything renumbers. Writes back only when something changed.
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
    observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'data-unnumbered', 'data-label'] });
    return () => observer.disconnect();
  }, [root]);
  return index;
}
