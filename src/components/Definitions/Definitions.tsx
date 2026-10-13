import { useContext, useEffect, type ReactNode } from 'react';
import { DocumentScopeContext, scopedId, termId } from '../Document/documentIndex';
import './Definitions.css';

/**
 * A document's defined terms, as a list: each Definition is a term and what it means. References
 * to a term (`<Xref to="def-services" />`) link here and read as the term; defining one twice is
 * marked and reported. A term defined in running text (a party in the preamble) is a Term instead.
 */
export function Definitions({ children }: { children: ReactNode }) {
  return (
    <dl className="definitions" data-doc="definitions">
      {children}
    </dl>
  );
}

export interface DefinitionProps {
  /** The term ("Services"). Required. */
  term: string;
  /** The id references use. Default: "def-" and the term ("def-services"). */
  id?: string;
  /** What the term means. Required. */
  children: ReactNode;
}

/** One defined term in Definitions: the term, in bold, and its meaning. */
export function Definition({ term, id, children }: DefinitionProps) {
  const doc = useContext(DocumentScopeContext);
  const key = id ?? termId(term);
  const twice = (doc?.index.terms[key]?.count ?? 0) > 1;

  useEffect(() => {
    if (twice) console.error(`Definition: "${key}" is defined more than once in this document.`);
  }, [twice, key]);

  return (
    <>
      <dt className="definitions__term" id={doc ? scopedId(doc.scope, 'term', key) : undefined}>
        <dfn className="definitions__dfn" data-term={key} data-duplicate={twice ? 'true' : undefined}>
          {term}
        </dfn>
      </dt>
      <dd className="definitions__meaning">{children}</dd>
    </>
  );
}
