import type { ReactNode } from 'react';
import './Change.css';

/** What a tracked change did: Word's insertion, deletion and the two ends of a move. */
export type ChangeKind = 'insert' | 'delete' | 'move-from' | 'move-to';

/** A reviewer's colour (color.category.*), the same for every change they make (Word's “By author”). */
export type ChangeColor = 1 | 2 | 3 | 4 | 5 | 6;

export interface ChangeProps {
  /** Inserted (underlined), deleted (struck through), or moved (green, double struck / double underlined). Required. */
  kind: ChangeKind;
  /** Who made the change ("Maya Okafor"): announced with it ("Deleted by Maya Okafor"). */
  author?: string;
  /** The author's colour. Use one per reviewer, and the same one as their signature block. Moves are always green. Default 1. */
  color?: ChangeColor;
  /** The changed text. Required. */
  children: ReactNode;
}

const VERB: Record<ChangeKind, string> = { insert: 'Inserted', delete: 'Deleted', 'move-from': 'Moved from here', 'move-to': 'Moved here' };

/** What a change is called for assistive technology: “Deleted by Jon Park”. */
export const changeLabel = (kind: ChangeKind, author?: string) => (author ? `${VERB[kind]} by ${author}` : VERB[kind]);

/**
 * A tracked change in a document compare view (a redline), marked as Microsoft Word marks it:
 * insertions underlined and deletions struck through in the author's colour, moves in green with
 * double lines, and a bar in the left margin beside every paragraph that holds a change. Renders
 * <ins> or <del>; what the change is and who made it is announced from CSS, so it never ends up in
 * copied text.
 */
export function Change({ kind, author, color = 1, children }: ChangeProps) {
  const Element = kind === 'insert' || kind === 'move-to' ? 'ins' : 'del';
  return (
    <Element className="change" data-kind={kind} data-color={String(color)} data-label={changeLabel(kind, author)}>
      {children}
    </Element>
  );
}
