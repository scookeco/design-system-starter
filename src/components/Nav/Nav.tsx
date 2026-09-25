import { createContext, useContext, useId, type MouseEvent } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import { RouterLink } from '../Link/Link';
import { Tooltip } from '../Tooltip/Tooltip';
import './Nav.css';

/**
 * Internal: how a Nav inside AppShell's sidebar displays. AppShell provides 'rail' when the
 * sidebar is collapsed to an icon rail; every other Nav (a settings sub-nav, the narrow-screen
 * drawer) sees the default. Not exported from the public entry.
 */
export const NavDisplayContext = createContext<'full' | 'rail'>('full');

export interface NavItem {
  /** Visible label. Use the same word as the page title and breadcrumb it leads to. */
  label: string;
  href: string;
  /** Leading icon from the system set. Decorative: the label is the accessible name. */
  icon?: IconName;
}

export interface NavSection {
  /** Group heading, e.g. "Personal" / "Workspace". Names the group's list. */
  label?: string;
  items: readonly NavItem[];
}

export interface NavProps extends EscapeHatch {
  /** Accessible name of the navigation landmark ("Main", "Settings"). Required: pages carry several navs. */
  label: string;
  sections: readonly NavSection[];
  /** href of the current page. That link gets aria-current="page", not only a heavier look. */
  current?: string;
  /**
   * Client-side routing hook. When set, a plain click calls it instead of following the link;
   * modified clicks (new tab, new window) still use the browser. Apps with a router usually
   * inject its link once with LinkProvider instead.
   */
  onNavigate?: (href: string) => void;
}

const isPlainClick = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** Vertical navigation: the app's primary sidebar or a section sub-nav (settings). Grouped, data-driven. */
export function Nav({ label, sections, current, onNavigate, UNSAFE_className, UNSAFE_style }: NavProps) {
  const id = useId();
  const rail = useContext(NavDisplayContext) === 'rail';
  return (
    <nav aria-label={label} className={cx('nav', UNSAFE_className)} style={UNSAFE_style} data-display={rail ? 'rail' : undefined}>
      {sections.map((section, index) => {
        const headingId = `${id}-section-${String(index)}`;
        return (
          <div className="nav__section" key={section.label ?? index}>
            {section.label ? (
              <span className={rail ? 'nav__heading visually-hidden' : 'nav__heading'} id={headingId}>
                {section.label}
              </span>
            ) : null}
            <ul role="list" className="nav__list" aria-labelledby={section.label ? headingId : undefined}>
              {section.items.map((item) => {
                const link = (
                  <RouterLink
                    className="nav__link"
                    href={item.href}
                    aria-current={item.href === current ? 'page' : undefined}
                    onClick={(event) => {
                      if (!onNavigate || !isPlainClick(event)) return;
                      event.preventDefault();
                      onNavigate(item.href);
                    }}
                  >
                    {item.icon ? (
                      <Icon name={item.icon} />
                    ) : rail ? (
                      <span className="nav__initial" aria-hidden="true">
                        {Array.from(item.label)[0]}
                      </span>
                    ) : null}
                    {/* In the rail the label is visually hidden, so it stays the link's accessible name. */}
                    <span className={rail ? 'nav__label visually-hidden' : 'nav__label'}>{item.label}</span>
                  </RouterLink>
                );
                return (
                  <li key={item.href}>
                    {rail ? (
                      <Tooltip content={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
