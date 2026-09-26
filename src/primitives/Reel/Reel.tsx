import { vars, type GapToken, type GridItemToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Reel.css';

export type ReelProps = Omit<LayoutProps, 'as'> & {
  /** Accessible name of the scrolling region ("Recent files"). Required: the region takes keyboard focus. */
  label: string;
  /** Space between items. */
  gap?: GapToken;
  /** Width of each item. `auto` lets each item size itself. */
  itemWidth?: GridItemToken | 'auto';
};

/**
 * A single row that scrolls sideways, snapping to the start of each item: a strip of cards,
 * thumbnails or suggestions that would otherwise wrap. The row is a named region in the tab
 * order, so it scrolls with the arrow keys even when its items aren't focusable.
 */
export function Reel({ label, gap = 'md', itemWidth = 'md', UNSAFE_className, UNSAFE_style, ...rest }: ReelProps) {
  return (
    <div
      {...rest}
      className={cx('reel', UNSAFE_className)}
      role="region"
      aria-label={label}
      tabIndex={0}
      data-item-width={itemWidth === 'auto' ? 'auto' : undefined}
      style={tokenStyle(
        { '--reel-gap': vars.space.gap[gap], '--reel-item': itemWidth === 'auto' ? undefined : vars.size['grid-item'][itemWidth] },
        UNSAFE_style,
      )}
    />
  );
}
