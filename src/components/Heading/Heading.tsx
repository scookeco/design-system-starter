import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import './Heading.css';

export type HeadingLevel = 1 | 2 | 3 | 4;

export type HeadingProps = Closed<ComponentPropsWithRef<'h1'>> & {
  /** Document outline level. Required: never skip levels to get a size. */
  level: HeadingLevel;
  /** Visual size, when it must differ from the level. Defaults to the level. */
  size?: HeadingLevel;
  children: ReactNode;
};

export function Heading({ level, size = level, UNSAFE_className, UNSAFE_style, ...rest }: HeadingProps) {
  const Element = `h${level}` as const;
  return <Element {...rest} className={cx('heading', UNSAFE_className)} style={UNSAFE_style} data-size={size} />;
}
