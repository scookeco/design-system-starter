import type { ReactNode } from 'react';
import './Highlight.css';

/** What a highlight means. Tones can show together; each colour keeps one meaning. */
export type HighlightTone = 'highlight' | 'search' | 'ai';

export interface HighlightProps {
  /** highlight = the reader's own (yellow, the default), search = Find's matches (blue), ai = what an AI answer cites (purple). */
  tone?: HighlightTone;
  /** For linking to it (a citation's target, a search result). */
  id?: string;
  children: ReactNode;
}

/**
 * A highlighted passage: a <mark> with a rounded background that reaches just past its text. Background
 * only, no outline or underline, so every highlight should also be reachable without seeing colour
 * (Find's results, the citation that points to it).
 */
export function Highlight({ tone = 'highlight', id, children }: HighlightProps) {
  return (
    <mark className="highlight-mark" data-tone={tone === 'highlight' ? undefined : tone} id={id}>
      {children}
    </mark>
  );
}
