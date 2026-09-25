import { useId, useState, type MouseEvent, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../../components/Button/Button';
import { Drawer } from '../../components/Drawer/Drawer';
import { Icon } from '../../components/Icon/Icon';
import { NavDisplayContext } from '../../components/Nav/Nav';
import { ToastProvider } from '../../components/Toast/Toast';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import './AppShell.css';

const DEFAULT_STORAGE_KEY = 'app-shell.sidebar-collapsed';

/** Storage can be missing or throw (private windows, blocked site data): remembering is best effort. */
const readCollapsed = (key: string | null): boolean | undefined => {
  if (key === null) return undefined;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? undefined : stored === 'true';
  } catch {
    return undefined;
  }
};

const writeCollapsed = (key: string | null, collapsed: boolean) => {
  if (key === null) return;
  try {
    window.localStorage.setItem(key, String(collapsed));
  } catch {
    // Not remembered this time; the toggle still works.
  }
};

export interface AppShellProps extends EscapeHatch {
  /** Product name or mark at the top of the sidebar. */
  brand: ReactNode;
  /** Primary navigation: a <Nav label="Main">. It renders its own labelled nav landmark. */
  nav: ReactNode;
  /** Page trail in the header: <Breadcrumbs>. Omit on top-level pages. */
  breadcrumbs?: ReactNode;
  /** Global actions in the header (search, one global create). Never page navigation. */
  actions?: ReactNode;
  /**
   * Help, in the same place on every page (WCAG 2.2 SC 3.2.6 Consistent Help): a Help menu with
   * self-help and a way to contact a person. Rendered in the header, after the global actions and
   * right before the account menu. Pass it from the app's one shell composition, never per page.
   */
  help?: ReactNode;
  /** Account menu, anchored at the header's inline end: <Menu trigger={…Avatar…}>. */
  userMenu?: ReactNode;
  /** The page. Rendered inside <main>, the only region that scrolls. */
  children: ReactNode;
  /**
   * Page action bar (a long form's Cancel · Save). Sticks to the bottom of main while the page
   * scrolls. A submit button here reaches its form with the form="<form id>" attribute.
   */
  footer?: ReactNode;
  /** First focusable element; jumps past the sidebar and header to main. */
  skipLinkLabel?: string;
  /** Label of the button that opens the navigation drawer when the shell is too narrow to show the sidebar; also the drawer's name. */
  menuLabel?: string;
  /** Start with the narrow-screen navigation drawer open (gallery and tests). */
  defaultNavOpen?: boolean;
  /**
   * Controlled: the wide-screen sidebar is collapsed to an icon rail. Pair with
   * onSidebarCollapsedChange. A controlled shell does not write to storage; the owner does.
   */
  sidebarCollapsed?: boolean;
  /** Uncontrolled starting state, used when nothing is remembered yet. */
  defaultSidebarCollapsed?: boolean;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
  /**
   * localStorage key under which the uncontrolled collapsed state is remembered across visits.
   * null turns remembering off (gallery and tests).
   */
  sidebarStorageKey?: string | null;
  /** Accessible name and tooltip of the rail toggle while the sidebar is expanded. */
  collapseSidebarLabel?: string;
  /** Accessible name and tooltip of the rail toggle while the sidebar is collapsed. */
  expandSidebarLabel?: string;
}

/**
 * The app frame every signed-in page renders inside: skip link, sidebar (brand + nav),
 * header (breadcrumbs, actions, account menu) and main. Pages fill its slots; they never
 * rebuild the frame. The toast region is mounted here, once.
 *
 * Wide: a toggle at the foot of the sidebar collapses it to an icon rail (labels move into
 * tooltips; accessible names stay). The choice is remembered in localStorage.
 *
 * Below the size.breakpoint.md container width the sidebar is replaced by a Menu button that
 * opens the nav in a Drawer from the inline start: scrim, focus trap, Escape, focus return.
 */
export function AppShell({
  brand,
  nav,
  breadcrumbs,
  actions,
  help,
  userMenu,
  children,
  footer,
  skipLinkLabel = 'Skip to content',
  menuLabel = 'Menu',
  defaultNavOpen = false,
  sidebarCollapsed,
  defaultSidebarCollapsed = false,
  onSidebarCollapsedChange,
  sidebarStorageKey = DEFAULT_STORAGE_KEY,
  collapseSidebarLabel = 'Collapse sidebar',
  expandSidebarLabel = 'Expand sidebar',
  UNSAFE_className,
  UNSAFE_style,
}: AppShellProps) {
  const id = useId();
  const mainId = `${id}-main`;
  const sidebarId = `${id}-sidebar`;
  const [navOpen, setNavOpen] = useState(defaultNavOpen);
  const [storedCollapsed, setStoredCollapsed] = useState(() => readCollapsed(sidebarStorageKey) ?? defaultSidebarCollapsed);
  const collapsed = sidebarCollapsed ?? storedCollapsed;

  const toggleCollapsed = () => {
    const next = !collapsed;
    if (sidebarCollapsed === undefined) {
      setStoredCollapsed(next);
      writeCollapsed(sidebarStorageKey, next);
    }
    onSidebarCollapsedChange?.(next);
  };

  // Following a link inside the drawer closes it, so the new page is not covered.
  const closeOnNavigate = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('a')) setNavOpen(false);
  };
  const skipToMain = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(mainId)?.focus();
  };

  return (
    <ToastProvider>
      <div className={cx('app-shell', UNSAFE_className)} style={UNSAFE_style}>
        <a className="app-shell__skip" href={`#${mainId}`} onClick={skipToMain}>
          {skipLinkLabel}
        </a>
        <div className="app-shell__frame" data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
          <div className="app-shell__sidebar" id={sidebarId}>
            <div className="app-shell__brand">{brand}</div>
            <NavDisplayContext value={collapsed ? 'rail' : 'full'}>{nav}</NavDisplayContext>
            <div className="app-shell__collapse">
              <Tooltip content={collapsed ? expandSidebarLabel : collapseSidebarLabel} side="right">
                <button
                  type="button"
                  className="app-shell__collapse-button"
                  aria-label={collapsed ? expandSidebarLabel : collapseSidebarLabel}
                  aria-expanded={!collapsed}
                  aria-controls={sidebarId}
                  onClick={toggleCollapsed}
                >
                  <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} />
                </button>
              </Tooltip>
            </div>
          </div>
          <header className="app-shell__header">
            <div className="app-shell__toggle">
              <Drawer
                title={menuLabel}
                hideTitle
                side="start"
                size="sm"
                open={navOpen}
                onOpenChange={setNavOpen}
                trigger={
                  <Button variant="ghost" icon="menu">
                    {menuLabel}
                  </Button>
                }
              >
                {/* The drawer always shows full labels, whatever the wide sidebar's state. */}
                <div className="app-shell__drawer-nav" onClick={closeOnNavigate}>
                  <div className="app-shell__brand">{brand}</div>
                  <NavDisplayContext value="full">{nav}</NavDisplayContext>
                </div>
              </Drawer>
            </div>
            <div className="app-shell__context">{breadcrumbs}</div>
            {actions || help || userMenu ? (
              <div className="app-shell__actions">
                {actions}
                {help ? <div className="app-shell__help">{help}</div> : null}
                {userMenu ? <div className="app-shell__user">{userMenu}</div> : null}
              </div>
            ) : null}
          </header>
          <main className="app-shell__main" id={mainId} tabIndex={-1}>
            {children}
            {footer ? <div className="app-shell__footer">{footer}</div> : null}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
