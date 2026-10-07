import type { ReactNode } from 'react';
import './ClauseNote.css';

/** Where a clause sits in negotiation, as each clause in a clause library records it. */
export type NegotiationPosition = 'balanced' | 'seller-favored' | 'buyer-favored';

/** A contract type's colour (color.category.*), the same wherever that type's clauses appear. */
export type ClauseSourceColor = 1 | 2 | 3 | 4 | 5 | 6;

export interface ClauseNoteProps {
  /** The clause's negotiation position. Set this or `source`. */
  position?: NegotiationPosition;
  /** The contract type the clause comes from in the clause library ("DPA"). Set this or `position`. */
  source?: string;
  /** The source's colour: one per contract type. Default 1. */
  color?: ClauseSourceColor;
  /** One line of detail: what makes it that position, or the library reference. */
  children?: ReactNode;
}

const POSITION: Record<NegotiationPosition, string> = { balanced: 'Balanced', 'seller-favored': 'Seller-favored', 'buyer-favored': 'Buyer-favored' };

/**
 * A note about a clause for whoever drafts or reviews the agreement, never part of the signed
 * text: its negotiation position (Balanced, Seller-favored, Buyer-favored) or the contract type it
 * comes from in the clause library. Pass it to a Clause's `note`: it sits in the margin beside the
 * paper when the viewer is wide enough, and under the clause heading when it is not. The words
 * carry the meaning; a source's bar is in its contract type's colour.
 */
export function ClauseNote({ position, source, color = 1, children }: ClauseNoteProps) {
  const kind = source ? 'source' : 'position';
  return (
    <div className="clause-note" role="note" data-kind={kind} data-color={source ? String(color) : undefined}>
      <span className="clause-note__kind">{source ? 'Source' : 'Position'}</span>
      <span className="clause-note__value">{source ?? POSITION[position ?? 'balanced']}</span>
      {children ? <span className="clause-note__detail">{children}</span> : null}
    </div>
  );
}
