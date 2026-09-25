import { vars, type ContentWidthToken, type GapToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Switcher.css';

export type SwitcherProps = LayoutProps & {
  /** Container width below which every child stacks. Above it they all sit in one row, equal width. */
  threshold?: ContentWidthToken;
  /** Space between children, both directions. */
  gap?: GapToken;
};

/**
 * A row of equal items that becomes a column, all at once, when its container is narrower than
 * the threshold. No media query and no in-between wrap: one row or one column.
 */
export function Switcher({ as: Element = 'div', threshold = 'sm', gap = 'md', UNSAFE_className, UNSAFE_style, ...rest }: SwitcherProps) {
  return (
    <Element
      {...rest}
      className={cx('switcher', UNSAFE_className)}
      style={tokenStyle({ '--switcher-gap': vars.space.gap[gap], '--switcher-threshold': vars.size.content[threshold] }, UNSAFE_style)}
    />
  );
}
