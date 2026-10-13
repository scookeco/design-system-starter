import { useContext, useEffect, useId, type ReactNode } from 'react';
import { Clause } from '../Clause/Clause';
import { ClauseDepthContext, DocumentScopeContext, ExhibitContext, SectionDepthContext, scopedId } from '../Document/documentIndex';
import { Heading, type HeadingLevel } from '../Heading/Heading';
import './DocumentSection.css';

export interface DocumentSectionProps {
  /** Stable id that references use (`<Xref to="leave" />` reads its title). Unique in the document. Required. */
  id: string;
  /** The section's heading ("Leave and time off"). Required. */
  title: string;
  /** Numbered like a top-level clause (it is one). Default false: a section of a handbook, a policy, a letter. */
  numbered?: boolean;
  /** The section's content: paragraphs, lists, tables, and nested sections or clauses. */
  children: ReactNode;
}

/**
 * A titled section of a Document that is not a contract clause: a handbook chapter, a policy's
 * scope, a letter's enclosures. Its heading takes the next outline level; the Toc lists it and an
 * Xref names it by its title. Clauses inside it number as if it weren't there. `numbered` makes it
 * a Clause.
 */
export function DocumentSection({ id, title, numbered = false, children }: DocumentSectionProps) {
  const doc = useContext(DocumentScopeContext);
  const sections = useContext(SectionDepthContext);
  const clauses = useContext(ClauseDepthContext);
  const inExhibit = useContext(ExhibitContext) !== null;
  const headingId = useId();
  const at = doc?.index.clauses[id];

  useEffect(() => {
    if (at?.duplicate) console.error(`DocumentSection: two parts of this document have the id "${id}".`);
  }, [at?.duplicate, id]);

  if (numbered) {
    return (
      <Clause id={id} title={title}>
        {children}
      </Clause>
    );
  }
  const level = Math.min(4, (doc?.headingLevel ?? 2) + clauses + sections + (inExhibit ? 1 : 0)) as HeadingLevel;
  return (
    <SectionDepthContext value={sections + 1}>
      <section
        className="document-section"
        data-doc="section"
        id={doc ? scopedId(doc.scope, 'clause', id) : undefined}
        data-clause={id}
        data-depth={String(clauses + 1)}
        data-unnumbered="true"
        aria-labelledby={headingId}
      >
        <Heading level={level} size={clauses + sections === 0 ? 3 : 4} id={headingId}>
          {title}
        </Heading>
        {children}
      </section>
    </SectionDepthContext>
  );
}
