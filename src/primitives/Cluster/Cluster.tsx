import { vars, type GapToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Cluster.css';

export type ClusterProps = LayoutProps & {
  /** Space between items, both axes. */
  gap?: GapToken;
  /** Main-axis distribution. `between` gives a two-zone "title left, actions right" bar. */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** Cross-axis alignment. */
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  /** Wrap onto new lines when space runs out. Defaults to true. */
  wrap?: boolean;
};

/** Horizontal group that wraps gracefully: toolbars, button rows, tag lists. */
export function Cluster({
  as: Element = 'div',
  gap = 'sm',
  justify = 'start',
  align = 'center',
  wrap = true,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: ClusterProps) {
  return (
    <Element
      {...rest}
      className={cx('cluster', UNSAFE_className)}
      data-justify={justify}
      data-align={align}
      data-wrap={wrap ? 'wrap' : 'nowrap'}
      style={tokenStyle({ '--cluster-gap': vars.space.gap[gap] }, UNSAFE_style)}
    />
  );
}
