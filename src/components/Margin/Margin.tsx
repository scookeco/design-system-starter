import type { ReactNode } from 'react';
import './Margin.css';

export interface MarginProps {
  /** Which margin: end (the right in left-to-right text, the default) or start. */
  side?: 'start' | 'end';
  /** What sits in the margin: a ClauseNote, an Initials slot. */
  children: ReactNode;
}

/**
 * The margin beside the part of the document it is in: a clause's note for whoever drafts it, the
 * per-page initials slot. It sits in the margin beside the paper when the viewer is wide enough,
 * and in the flow, under what it annotates, when it is not.
 */
export function Margin({ side = 'end', children }: MarginProps) {
  return (
    <aside className="document-margin" data-doc="margin" data-side={side}>
      {children}
    </aside>
  );
}
