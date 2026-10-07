import { useContext, useEffect, useId, type ReactNode } from 'react';
import { Heading } from '../Heading/Heading';
import { DocumentScopeContext, ExhibitContext, scopedId } from '../Clause/documentIndex';
import './Exhibit.css';

export interface ExhibitProps {
  /** Stable id that references use (`<ClauseRef to="dpa" />` → “Exhibit A”). Unique among clauses and exhibits. Required. */
  id: string;
  /** The exhibit's name ("Data Processing Agreement"). Required. */
  title: string;
  /** The exhibit's clauses: their numbering starts again at 1. */
  children: ReactNode;
}

/**
 * An exhibit attached to an agreement in the same DocumentViewer (a DPA, an SLA, an escrow
 * schedule): a rule, “Exhibit A” and its name, then its own clauses, numbered from 1. Letters
 * come from the order exhibits are attached. A ClauseRef into it reads “Section 2 of Exhibit B”;
 * one from it to the document's body reads “Section 7 of the Agreement”. The sheet stays one
 * continuous surface: an exhibit is a section, not a new page.
 */
export function Exhibit({ id, title, children }: ExhibitProps) {
  const doc = useContext(DocumentScopeContext);
  const headingId = useId();
  const at = doc?.index.exhibits[id];

  useEffect(() => {
    if (at?.duplicate) console.error(`Exhibit: two exhibits in this document have the id "${id}".`);
  }, [at?.duplicate, id]);

  return (
    <ExhibitContext value={id}>
      <section
        className="exhibit"
        id={doc ? scopedId(doc.scope, 'clause', id) : undefined}
        data-exhibit={id}
        data-duplicate={at?.duplicate ? 'true' : undefined}
        aria-labelledby={headingId}
      >
        <Heading level={doc?.headingLevel ?? 2} size={2} id={headingId}>
          <span className="exhibit__letter">Exhibit{at ? `\u00a0${at.letter}` : ''}</span>
          <span className="exhibit__title">{title}</span>
        </Heading>
        {children}
      </section>
    </ExhibitContext>
  );
}
