import type { ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './PageLayout.css';

/** An aside is complementary content, so it is a landmark and needs a name. */
type AsideSlot =
  | {
      /** Complementary content at the inline end: a record's properties rail. Rendered as <aside>. */
      aside: ReactNode;
      /** Accessible name of the aside landmark ("Properties"). Required with `aside`. */
      asideLabel: string;
    }
  | { aside?: undefined; asideLabel?: undefined };

export type PageLayoutProps = EscapeHatch &
  AsideSlot & {
    /** The page's main column. A plain region: AppShell's <main> already contains it. */
    children: ReactNode;
    /**
     * Section navigation at the inline start: a <Nav label="…"> (a settings sub-nav). Nav renders
     * its own labelled nav landmark, so this slot adds no landmark of its own.
     */
    nav?: ReactNode;
  };

/**
 * The regions of a page's body, below its PageHeader: an optional section nav at the inline start,
 * the main column, and an optional aside at the inline end. When the container is narrower than
 * size.breakpoint.sm the regions stack in reading order: nav, main, aside.
 */
export function PageLayout({ children, nav, aside, asideLabel, UNSAFE_className, UNSAFE_style }: PageLayoutProps) {
  return (
    <div className={cx('page-layout', UNSAFE_className)} style={UNSAFE_style}>
      <div className="page-layout__grid" data-nav={nav ? 'true' : undefined} data-aside={aside ? 'true' : undefined}>
        {nav ? <div className="page-layout__nav">{nav}</div> : null}
        <div className="page-layout__main">{children}</div>
        {aside ? (
          <aside className="page-layout__aside" aria-label={asideLabel}>
            {aside}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
