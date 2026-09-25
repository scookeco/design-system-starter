import type { MouseEvent } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { RouterLink } from '../Link/Link';
import './NavTabs.css';

export interface NavTab {
  /** Visible label and accessible name. Short and parallel: "Overview", "Activity", "Files". */
  label: string;
  /** The section's own URL. Each tab is a page: it can be bookmarked, shared and opened in a new tab. */
  href: string;
}

export interface NavTabsProps extends EscapeHatch {
  /** Accessible name of the navigation landmark ("Record sections"). Required: pages carry several navs. */
  label: string;
  items: readonly NavTab[];
  /** href of the current section. That link gets aria-current="page". */
  current: string;
  /**
   * Client-side routing hook. When set, a plain click calls it instead of following the link;
   * modified clicks (new tab, new window) still use the browser. Apps with a router usually
   * inject its link once with LinkProvider instead.
   */
  onNavigate?: (href: string) => void;
}

const isPlainClick = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/**
 * Section navigation that looks like tabs but is links: each section is its own route.
 * A labelled nav landmark with aria-current="page" on the current link, not an ARIA tablist.
 */
export function NavTabs({ label, items, current, onNavigate, UNSAFE_className, UNSAFE_style }: NavTabsProps) {
  return (
    <nav aria-label={label} className={cx('nav-tabs', UNSAFE_className)} style={UNSAFE_style}>
      <ul role="list" className="nav-tabs__list">
        {items.map((item) => (
          <li key={item.href}>
            <RouterLink
              className="nav-tabs__link"
              href={item.href}
              aria-current={item.href === current ? 'page' : undefined}
              onClick={(event) => {
                if (!onNavigate || !isPlainClick(event)) return;
                event.preventDefault();
                onNavigate(item.href);
              }}
            >
              {item.label}
            </RouterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
