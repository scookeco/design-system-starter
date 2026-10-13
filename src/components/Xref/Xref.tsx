import { useContext, useEffect, type ReactNode } from 'react';
import { DocumentScopeContext, ExhibitContext, jumpTo, scopedId } from '../Document/documentIndex';
import './Xref.css';

export interface XrefProps {
  /** The id of what it refers to: a Clause or DocumentSection ("liability"), an Exhibit ("dpa"), or a defined term ("def-customer"). Required. */
  to: string;
  /** The word before a clause's number. Default "Section". */
  prefix?: string;
  /** Text to show instead of the resolved label: a defined term as the sentence needs it ("Customer’s"). */
  children?: ReactNode;
}

/**
 * A cross-reference inside a Document, resolved from what its target is now, so it never goes
 * stale: a clause reads “Section 3.1(a)” (and says which document, across an exhibit's edge), an
 * exhibit “Exhibit A”, an unnumbered section its title, a defined term the term itself. It links
 * to the target and moves focus there; a no-break space keeps “Section” and the number together.
 * A reference with no target is marked in place and reported in the console.
 */
export function Xref({ to, prefix = 'Section', children }: XrefProps) {
  const doc = useContext(DocumentScopeContext);
  const own = useContext(ExhibitContext);
  const clause = doc?.index.clauses[to];
  const exhibit = doc?.index.exhibits[to];
  const term = doc?.index.terms[to];
  const broken = Boolean(doc?.index.ready) && !clause && !exhibit && !term;

  useEffect(() => {
    if (broken) console.error(`Xref: nothing in this document has the id "${to}".`);
  }, [broken, to]);

  if (!doc || (!clause && !exhibit && !term)) {
    return (
      <span className="xref" data-doc="xref" data-broken={broken ? 'true' : undefined}>
        {children ?? (broken ? `${prefix}\u00a0[${to}?]` : prefix)}
      </span>
    );
  }
  const target = scopedId(doc.scope, term ? 'term' : 'clause', to);
  let label: string;
  if (clause) {
    // A reference across scopes says where: into an exhibit, or from one back to the document's body.
    const letterOf = (id: string) => doc.index.exhibits[id]?.letter ?? '?';
    const where = clause.exhibit !== own ? (clause.exhibit ? ` of Exhibit\u00a0${letterOf(clause.exhibit)}` : ` of ${doc.documentName}`) : '';
    label = clause.ref ? `${prefix}\u00a0${clause.ref}${where}` : clause.title;
  } else if (exhibit) {
    label = `Exhibit\u00a0${exhibit.letter}`;
  } else {
    label = term?.text ?? to;
  }
  return (
    <a className="xref" data-doc="xref" data-kind={term ? 'term' : 'section'} href={`#${target}`} onClick={(event) => jumpTo(event, target)}>
      {children ?? label}
    </a>
  );
}
