import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import './Text.css';

export type TextProps = Closed<ComponentPropsWithRef<'p'>> & {
  /** dt/dd for label–value pairs inside a <Stack as="dl"> (a record's properties). */
  as?: 'p' | 'span' | 'div' | 'dt' | 'dd';
  size?: 'body' | 'body-lg' | 'caption';
  tone?: 'default' | 'muted';
  /** Tabular figures for numbers that line up in columns. */
  numeric?: boolean;
  children: ReactNode;
};

export function Text({
  as: Element = 'p',
  size = 'body',
  tone = 'default',
  numeric = false,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: TextProps) {
  return (
    <Element
      {...rest}
      className={cx('text', UNSAFE_className)}
      style={UNSAFE_style}
      data-size={size}
      data-tone={tone}
      data-numeric={numeric ? 'true' : undefined}
    />
  );
}
