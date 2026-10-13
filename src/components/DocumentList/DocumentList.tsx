import type { ReactNode } from 'react';
import './DocumentList.css';

/** How a list marks its items. The numbered ones are an ordered list. */
export type DocumentListStyle = 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'disc' | 'none';

const ORDERED = new Set<DocumentListStyle>(['decimal', 'lower-alpha', 'upper-alpha', 'lower-roman']);

export interface DocumentListProps {
  /** The marker: decimal (1. 2.), lower-alpha (a. b.), upper-alpha, lower-roman, disc (bullets, the default) or none. */
  listStyle?: DocumentListStyle;
  /** One DocumentListItem per item. Required. */
  children: ReactNode;
}

/**
 * A list in a document's text that is not part of its structure: the documents to bring, the
 * conditions that all apply. Numbered styles are an ordered list. For numbered provisions use
 * Clause, so they renumber and can be referred to.
 */
export function DocumentList({ listStyle = 'disc', children }: DocumentListProps) {
  const List = ORDERED.has(listStyle) ? 'ol' : 'ul';
  return (
    <List className="document-list" data-doc="list" data-style={listStyle}>
      {children}
    </List>
  );
}

/** One item of a DocumentList. */
export function DocumentListItem({ children }: { children: ReactNode }) {
  return <li className="document-list__item">{children}</li>;
}
