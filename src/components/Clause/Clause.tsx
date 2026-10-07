import { useContext, useEffect, useId, type MouseEvent, type ReactNode } from 'react';
import { Heading, type HeadingLevel } from '../Heading/Heading';
import { ClauseDepthContext, DocumentScopeContext, scopedId, termKey } from './documentIndex';
import './Clause.css';

export interface ClauseProps {
  /** Stable id that references use (`<ClauseRef to="liability" />`). Unique in the document. Required. */
  id: string;
  /** The clause's heading ("Limitation of liability"). Sub-items such as (a) usually have none. */
  title?: string;
  /** The clause text: paragraphs, and nested Clauses for its sub-clauses. */
  children: ReactNode;
}

/**
 * A numbered clause in a DocumentViewer. Numbers come from where the clause is (1., 1.1, (a), (i)),
 * never typed, so adding, removing or reordering clauses renumbers the document and every
 * ClauseRef. Nest Clauses for sub-clauses. Outside a DocumentViewer it renders unnumbered.
 */
export function Clause({ id, title, children }: ClauseProps) {
  const doc = useContext(DocumentScopeContext);
  const depth = useContext(ClauseDepthContext) + 1;
  const headingId = useId();
  const at = doc?.index.clauses[id];
  const number = at ? <span className="clause__number">{at.number}</span> : null;
  const level = Math.min(4, (doc?.headingLevel ?? 2) + depth - 1) as HeadingLevel;
  const Element = title ? 'section' : 'div';

  useEffect(() => {
    if (at?.duplicate) console.error(`Clause: two clauses in this document have the id "${id}"; references to it are ambiguous.`);
  }, [at?.duplicate, id]);

  return (
    <ClauseDepthContext value={depth}>
      <Element
        className="clause"
        id={doc ? scopedId(doc.scope, 'clause', id) : undefined}
        data-clause={id}
        data-depth={depth}
        data-duplicate={at?.duplicate ? 'true' : undefined}
        aria-labelledby={title ? headingId : undefined}
      >
        {title ? (
          <Heading level={level} size={depth === 1 ? 3 : 4} id={headingId}>
            {number}
            {title}
          </Heading>
        ) : (
          number
        )}
        {children}
      </Element>
    </ClauseDepthContext>
  );
}

export interface ClauseRefProps {
  /** The id of the Clause it points to. Required. */
  to: string;
  /** The word before the number. Default "Section". */
  prefix?: string;
}

/**
 * A reference to another clause in the same document ("Section 3.1(a)"), resolved from where that
 * clause is now, so it never goes stale. It links to the clause and moves focus there. A missing
 * target is marked in the document and reported in the console.
 */
export function ClauseRef({ to, prefix = 'Section' }: ClauseRefProps) {
  const doc = useContext(DocumentScopeContext);
  const at = doc?.index.clauses[to];
  const missing = Boolean(doc?.index.ready) && !at;

  useEffect(() => {
    if (missing) console.error(`ClauseRef: no clause "${to}" in this document.`);
  }, [missing, to]);

  if (!doc || !at) {
    return (
      <span className="clause-ref" data-unresolved={missing ? 'true' : undefined}>
        {prefix} {missing ? `[${to}?]` : ''}
      </span>
    );
  }
  const target = scopedId(doc.scope, 'clause', to);
  const jump = (event: MouseEvent<HTMLAnchorElement>) => {
    const clause = event.currentTarget.ownerDocument.getElementById(target);
    if (!clause) return;
    event.preventDefault();
    clause.tabIndex = -1;
    clause.focus();
  };
  return (
    <a className="clause-ref" href={`#${target}`} onClick={jump}>
      {prefix} {at.ref}
    </a>
  );
}

export interface TermProps {
  /** The term as written here ("Confidential Information"). Required. */
  children: string;
  /** This is where the term is defined: shown in quotes, in bold. Define each term once. */
  define?: boolean;
  /** The term this refers to, when the text differs (a plural or possessive: "Customer’s" → "Customer"). */
  name?: string;
}

/**
 * A defined term: defined once (`define`) and used by name everywhere else, so a term used but
 * never defined, or defined twice, is marked in the document and reported in the console.
 */
export function Term({ children, define = false, name }: TermProps) {
  const doc = useContext(DocumentScopeContext);
  const key = termKey(name ?? children);
  const count = doc?.index.terms[key] ?? 0;
  const ready = Boolean(doc?.index.ready);
  const undefinedTerm = ready && !define && count === 0;
  const twice = define && count > 1;

  useEffect(() => {
    if (undefinedTerm) console.error(`Term: "${key}" is used but never defined in this document.`);
    if (twice) console.error(`Term: "${key}" is defined ${count} times in this document.`);
  }, [undefinedTerm, twice, key, count]);

  if (define) {
    return (
      <>
        “
        <dfn className="term" id={doc ? scopedId(doc.scope, 'term', key) : undefined} data-term={key} data-duplicate={twice ? 'true' : undefined}>
          {children}
        </dfn>
        ”
      </>
    );
  }
  return (
    <span className="term" data-term-use={key} data-unresolved={undefinedTerm ? 'true' : undefined}>
      {children}
    </span>
  );
}
