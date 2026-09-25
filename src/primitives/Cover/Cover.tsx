import type { ReactNode } from 'react';
import { vars, type GapToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Cover.css';

export type CoverProps = LayoutProps & {
  /** Pinned to the block start (a brand). */
  header?: ReactNode;
  /** Pinned to the block end (legal links). */
  footer?: ReactNode;
  /** fill: at least the parent's block size (the parent must have one). viewport: at least the viewport's. */
  minBlockSize?: 'fill' | 'viewport';
  /** Minimum space between the header, the centred content and the footer. */
  gap?: GapToken;
};

/**
 * Vertically centres its content in the available block size, with optional header and footer
 * pinned to the edges. When the content is taller than the space, everything flows and scrolls.
 */
export function Cover({
  as: Element = 'div',
  header,
  footer,
  minBlockSize = 'fill',
  gap = 'lg',
  children,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: CoverProps) {
  return (
    <Element
      {...rest}
      className={cx('cover', UNSAFE_className)}
      data-min-block-size={minBlockSize}
      style={tokenStyle({ '--cover-gap': vars.space.gap[gap] }, UNSAFE_style)}
    >
      {header ? <div className="cover__header">{header}</div> : null}
      <div className="cover__centered">{children}</div>
      {footer ? <div className="cover__footer">{footer}</div> : null}
    </Element>
  );
}
