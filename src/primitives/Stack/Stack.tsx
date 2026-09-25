import { vars, type GapToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Stack.css';

export type StackProps = LayoutProps & {
  /** Space between children. Token-typed: raw values are not accepted. */
  gap?: GapToken;
  /** Cross-axis alignment of children. */
  align?: 'stretch' | 'start' | 'center' | 'end';
};

/** Vertical flow with consistent spacing. The parent owns the space between siblings. */
export function Stack({ as: Element = 'div', gap = 'md', align = 'stretch', UNSAFE_className, UNSAFE_style, ...rest }: StackProps) {
  return (
    <Element
      {...rest}
      className={cx('stack', UNSAFE_className)}
      data-align={align}
      style={tokenStyle({ '--stack-gap': vars.space.gap[gap] }, UNSAFE_style)}
    />
  );
}
