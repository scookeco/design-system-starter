import type { ReactNode } from 'react';
import { vars, type GapToken, type SidebarWidthToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Sidebar.css';

export type SidebarProps = LayoutProps & {
  /** Content of the narrow side region. */
  side: ReactNode;
  /** Which edge the side region sits on. DOM order follows, so reading order matches. */
  placement?: 'start' | 'end';
  /** Preferred width of the side region. */
  sideWidth?: SidebarWidthToken;
  /** Space between the regions. */
  gap?: GapToken;
};

/**
 * Side region beside main content. When the content would drop below half the
 * container, the two stack. No media query: it responds to its container.
 */
export function Sidebar({
  as: Element = 'div',
  side,
  placement = 'start',
  sideWidth = 'md',
  gap = 'lg',
  children,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: SidebarProps) {
  const sideRegion = <div className="sidebar__side">{side}</div>;
  const content = <div className="sidebar__content">{children}</div>;
  return (
    <Element
      {...rest}
      className={cx('sidebar', UNSAFE_className)}
      style={tokenStyle({ '--sidebar-gap': vars.space.gap[gap], '--sidebar-width': vars.size.sidebar[sideWidth] }, UNSAFE_style)}
    >
      {placement === 'start' ? sideRegion : content}
      {placement === 'start' ? content : sideRegion}
    </Element>
  );
}
