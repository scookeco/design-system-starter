import type { ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './FocusedLayout.css';

export interface FocusedLayoutProps extends EscapeHatch {
  /** Product name or mark at the header's inline start. */
  brand: ReactNode;
  /** The task, in the header ("Set up your workspace"). Plain text: the page's h1 is the step's PageHeader. */
  task: string;
  /** The way out, at the header's inline end: a ghost Button or a Link ("Exit setup"). Required: a focused task never traps. */
  exit: ReactNode;
  /** A Progress bar under the header, across the column. */
  progress?: ReactNode;
  /** The content column: Stepper, PageHeader, the step's form. */
  children: ReactNode;
  /** Action bar (Back · Next). Sticks to the bottom of main while the step scrolls. */
  footer?: ReactNode;
}

/**
 * The frame for a focused, multi-step task (a setup wizard, a multi-step create): no sidebar, a
 * header with the task and a way out, one centred column, and a sticky action bar. Only main scrolls.
 */
export function FocusedLayout({ brand, task, exit, progress, children, footer, UNSAFE_className, UNSAFE_style }: FocusedLayoutProps) {
  return (
    <div className={cx('focused-layout', UNSAFE_className)} style={UNSAFE_style}>
      <header className="focused-layout__header">
        <span className="focused-layout__brand">{brand}</span>
        <span className="focused-layout__task">{task}</span>
        <div className="focused-layout__exit">{exit}</div>
      </header>
      <main className="focused-layout__main">
        <div className="focused-layout__column">
          {progress}
          {children}
        </div>
        {footer ? (
          <div className="focused-layout__footer">
            <div className="focused-layout__column">{footer}</div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
