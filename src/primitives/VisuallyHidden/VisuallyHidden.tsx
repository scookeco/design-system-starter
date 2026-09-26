import type { ReactNode } from 'react';
import './VisuallyHidden.css';

export interface VisuallyHiddenProps {
  /** Text for assistive technology only. */
  children: ReactNode;
  /** span (the default) inside inline content; div around block content such as a heading. */
  as?: 'span' | 'div';
  id?: string;
}

/**
 * Content that screen readers announce but the screen doesn't show: a heading for a region whose
 * purpose is visually obvious, the words behind a symbol. Clipped, not display:none, so it stays
 * in the accessibility tree. It has no escape hatch: there is nothing on it to style.
 */
export function VisuallyHidden({ children, as: Element = 'span', id }: VisuallyHiddenProps) {
  return (
    <Element className="screen-reader-only" id={id}>
      {children}
    </Element>
  );
}
