import { Fragment, type ReactNode } from 'react';

/** Render a docs string, turning `backticked` spans into <code>. */
export function inline(text: string): ReactNode {
  return text.split('`').map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>));
}
