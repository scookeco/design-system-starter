import type { CSSProperties } from 'react';

/**
 * The only styling escape hatch on system components and primitives.
 *
 * The UNSAFE_ prefix makes every use greppable and countable. Consumer code must
 * justify each use with an eslint-disable comment that carries a reason, an owner
 * and a removal condition. A repeated override is a missing variant: propose one.
 */
export interface EscapeHatch {
  /** Escape hatch. Prefer a variant; see CLAUDE.md "UI rules". */
  UNSAFE_className?: string;
  /** Escape hatch. Prefer a variant; see CLAUDE.md "UI rules". */
  UNSAFE_style?: CSSProperties;
}

/** Strip className and style from a props type and add the named escape hatch instead. */
export type Closed<P> = Omit<P, 'className' | 'style'> & EscapeHatch;

/** Join class names, skipping falsy entries. */
export const cx = (...names: (string | false | null | undefined)[]): string => names.filter(Boolean).join(' ');

/**
 * Build an inline style that sets component-local custom properties from token references.
 * Values must be var() references from the generated token map, never literals.
 */
export const tokenStyle = (
  properties: Record<`--${string}`, `var(--${string})` | undefined>,
  unsafe?: CSSProperties,
): CSSProperties => ({ ...(properties as CSSProperties), ...unsafe });
