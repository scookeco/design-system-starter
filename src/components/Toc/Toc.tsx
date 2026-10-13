import { useContext, type ReactNode } from 'react';
import { DocumentScopeContext, jumpTo, scopedId, type DocumentScope } from '../Document/documentIndex';
import './Toc.css';

export interface TocProps {
  /** How many clause levels it lists. Default 2 (1. and 1.1). */
  depth?: number;
  /** Names the list. Default "Contents". */
  label?: string;
}

interface Item {
  id: string;
  text: ReactNode;
  children: Item[];
}

/** The outline as a tree: exhibits at the top level, each clause under the clause or exhibit it is in. */
function tree(doc: DocumentScope, depth: number): Item[] {
  const root: Item[] = [];
  const stack: { level: number; items: Item[] }[] = [{ level: 0, items: root }];
  for (const entry of doc.index.outline) {
    const exhibit = entry.kind === 'exhibit' ? doc.index.exhibits[entry.id] : undefined;
    const clause = entry.kind === 'clause' ? doc.index.clauses[entry.id] : undefined;
    // An exhibit sits beside the body's top-level clauses; its own clauses go one below it.
    const level = exhibit ? 1 : (clause?.depth ?? 1) + (clause?.exhibit ? 1 : 0);
    if (!exhibit && (!clause?.title || clause.depth > depth)) continue;
    const text = exhibit ? (
      <>
        <span className="toc__number">Exhibit{'\u00a0'}{exhibit.letter}</span> {exhibit.title}
      </>
    ) : (
      <>
        {clause?.number ? <span className="toc__number">{clause.number}</span> : null} {clause?.title}
      </>
    );
    while ((stack.at(-1)?.level ?? 0) >= level) stack.pop();
    const item: Item = { id: entry.id, text, children: [] };
    (stack.at(-1)?.items ?? root).push(item);
    stack.push({ level, items: item.children });
  }
  return root;
}

/**
 * A Document's table of contents, generated from its clauses and exhibits as they are now, never
 * typed: numbers and titles follow every edit. Each entry links to its clause and moves focus there.
 */
export function Toc({ depth = 2, label = 'Contents' }: TocProps) {
  const doc = useContext(DocumentScopeContext);
  if (!doc) return null;
  const list = (items: Item[]) => (
    <ol className="toc__list">
      {items.map((item) => {
        const target = scopedId(doc.scope, 'clause', item.id);
        return (
          <li key={item.id} className="toc__item">
            <a className="toc__link" href={`#${target}`} onClick={(event) => jumpTo(event, target)}>
              {item.text}
            </a>
            {item.children.length ? list(item.children) : null}
          </li>
        );
      })}
    </ol>
  );
  return (
    <nav className="toc" data-doc="toc" aria-label={label}>
      {list(tree(doc, depth))}
    </nav>
  );
}
