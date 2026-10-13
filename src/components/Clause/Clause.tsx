import { useContext, useEffect, useId, type ReactNode } from 'react';
import { changeLabel, type ChangeColor, type ChangeKind } from '../Change/Change';
import { Heading, type HeadingLevel } from '../Heading/Heading';
import { Margin } from '../Margin/Margin';
import { ClauseDepthContext, DocumentScopeContext, ExhibitContext, SectionDepthContext, scopedId, termId } from '../Document/documentIndex';
import './Clause.css';

export interface ClauseProps {
  /** Stable id that references use (`<Xref to="liability" />`). Unique in the document. Required. */
  id: string;
  /** The clause's heading ("Limitation of liability"). Sub-items such as (a) usually have none. */
  title?: string;
  /** The clause text: paragraphs, and nested Clauses for its sub-clauses. */
  children: ReactNode;
  /** False for a clause that takes no number (a heading-only part, a preamble): the ones after it don't skip one. Default true. */
  numbered?: boolean;
  /** A ClauseNote for whoever drafts or reviews it, in a Margin: beside the paper when the viewer is wide enough, under the heading when not. */
  note?: ReactNode;
  /** Sets the clause's own paragraphs in capitals, as contracts set a liability cap or a damages waiver so it stands out. */
  conspicuous?: boolean;
  /** In a redline: the whole clause was inserted, deleted or moved (by `author`, in `color`). It keeps its number. */
  change?: { kind: ChangeKind; author?: string; color?: ChangeColor };
}

/**
 * A numbered clause in a Document. Numbers are CSS counters drawn from where the clause is (1.,
 * 1.1, (a), (i)), never typed, so adding, removing or reordering clauses renumbers the document
 * and every Xref. Nest Clauses for sub-clauses. Outside a Document it renders unnumbered.
 */
export function Clause({ id, title, children, numbered = true, note, conspicuous = false, change }: ClauseProps) {
  const doc = useContext(DocumentScopeContext);
  const depth = useContext(ClauseDepthContext) + 1;
  const sections = useContext(SectionDepthContext);
  const inExhibit = useContext(ExhibitContext) !== null;
  const headingId = useId();
  const at = doc?.index.clauses[id];
  // The number is generated content (Clause.css); data-number is the index's copy, for tooling.
  const number = doc && numbered ? <span className="clause__number" data-depth={String(Math.min(depth, 4))} data-number={at?.number} /> : null;
  // An exhibit's heading takes the document's top level, so its clauses start one below it.
  const level = Math.min(4, (doc?.headingLevel ?? 2) + depth - 1 + sections + (inExhibit ? 1 : 0)) as HeadingLevel;

  useEffect(() => {
    if (at?.duplicate) console.error(`Clause: two clauses in this document have the id "${id}"; references to it are ambiguous.`);
    if (depth > 4) console.error(`Clause: "${id}" is nested ${String(depth)} deep; clauses number four levels (1., 1.1, (a), (i)).`);
  }, [at?.duplicate, id, depth]);

  return (
    <ClauseDepthContext value={depth}>
      <section
        className="clause"
        data-doc="clause"
        id={doc ? scopedId(doc.scope, 'clause', id) : undefined}
        data-clause={id}
        data-depth={String(depth)}
        data-unnumbered={numbered ? undefined : 'true'}
        data-duplicate={at?.duplicate ? 'true' : undefined}
        data-conspicuous={conspicuous ? 'true' : undefined}
        data-change={change?.kind}
        data-change-color={change ? String(change.color ?? 1) : undefined}
        data-change-label={change ? changeLabel(change.kind, change.author) : undefined}
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
        {note ? <Margin>{note}</Margin> : null}
        {children}
      </section>
    </ClauseDepthContext>
  );
}

export interface TermProps {
  /** The term as defined here ("Confidential Information"). Required. */
  children: string;
  /** The id references use (`<Xref to="def-customer" />`). Default: "def-" and the term ("def-confidential-information"). */
  id?: string;
}

/**
 * A term defined in running text, as an agreement's preamble defines its parties: Acme Corp
 * (“Vendor”). Shown in quotes, in bold, and counted by the document, so a term defined twice is
 * marked and reported. Refer to it everywhere else with an Xref, which links here. For a list of
 * definitions, use Definitions.
 */
export function Term({ children, id }: TermProps) {
  const doc = useContext(DocumentScopeContext);
  const key = id ?? termId(children);
  const twice = (doc?.index.terms[key]?.count ?? 0) > 1;

  useEffect(() => {
    if (twice) console.error(`Term: "${key}" is defined more than once in this document.`);
  }, [twice, key]);

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
