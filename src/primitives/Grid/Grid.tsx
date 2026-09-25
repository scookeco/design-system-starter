import { vars, type GapToken, type GridItemToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Grid.css';

export type GridProps = LayoutProps & {
  /** Minimum item width. Columns are added or removed automatically, no breakpoints. */
  min?: GridItemToken;
  /** Space between cells. */
  gap?: GapToken;
};

/** Auto-fit card grid: as many equal columns as fit, each at least `min` wide. */
export function Grid({ as: Element = 'div', min = 'md', gap = 'md', UNSAFE_className, UNSAFE_style, ...rest }: GridProps) {
  return (
    <Element
      {...rest}
      className={cx('grid', UNSAFE_className)}
      style={tokenStyle({ '--grid-gap': vars.space.gap[gap], '--grid-min': vars.size['grid-item'][min] }, UNSAFE_style)}
    />
  );
}
