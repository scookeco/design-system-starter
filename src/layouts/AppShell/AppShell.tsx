import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../../components/Button/Button';
import { ToastProvider } from '../../components/Toast/Toast';
import './AppShell.css';

export interface AppShellProps extends EscapeHatch {
  /** Product name or mark at the top of the sidebar. */
  brand: ReactNode;
  /** Primary navigation: a <Nav label="Main">. It renders its own labelled nav landmark. */
  nav: ReactNode;
  /** Page trail in the header: <Breadcrumbs>. Omit on top-level pages. */
  breadcrumbs?: ReactNode;
  /** Global actions in the header (search, one global create). Never page navigation. */
  actions?: ReactNode;
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
  /** Label of the button that opens the sidebar when the shell is too narrow to show it. */
  menuLabel?: string;
  /** Start with the collapsed sidebar open (gallery and tests). */
  defaultNavOpen?: boolean;
}

/**
 * The app frame every signed-in page renders inside: skip link, sidebar (brand + nav),
 * header (breadcrumbs, actions, account menu) and main. Pages fill its slots; they never
 * rebuild the frame. The toast region is mounted here, once.
 *
 * Below the size.breakpoint.md container width the sidebar collapses behind a Menu button
 * and opens as a drawer over the content.
 */
export function AppShell({
  brand,
  nav,
  breadcrumbs,
  actions,
  userMenu,
  children,
  footer,
  skipLinkLabel = 'Skip to content',
  menuLabel = 'Menu',
  defaultNavOpen = false,
  UNSAFE_className,
  UNSAFE_style,
}: AppShellProps) {
  const id = useId();
  const mainId = `${id}-main`;
  const sidebarId = `${id}-sidebar`;
  const [navOpen, setNavOpen] = useState(defaultNavOpen);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const openedByToggle = useRef(false);

  // The drawer comes before the header in the DOM, so opening it moves focus into it;
  // otherwise Tab would carry on away from the nav that just appeared.
  useEffect(() => {
    if (!navOpen || !openedByToggle.current) return;
    openedByToggle.current = false;
    sidebarRef.current?.querySelector<HTMLElement>('a[href], button:not(:disabled)')?.focus();
  }, [navOpen]);

  const toggleNav = () => {
    openedByToggle.current = !navOpen;
    setNavOpen(!navOpen);
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !navOpen) return;
    setNavOpen(false);
    toggleRef.current?.focus();
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
        <div className="app-shell__frame" data-nav={navOpen ? 'open' : 'closed'}>
          <div className="app-shell__sidebar" id={sidebarId} ref={sidebarRef} onKeyDown={closeOnEscape} onClick={closeOnNavigate}>
            <div className="app-shell__brand">{brand}</div>
            {nav}
          </div>
          <header className="app-shell__header">
            <div className="app-shell__toggle">
              <Button
                ref={toggleRef}
                variant="ghost"
                icon="menu"
                aria-expanded={navOpen}
                aria-controls={sidebarId}
                onClick={toggleNav}
              >
                {menuLabel}
              </Button>
            </div>
            <div className="app-shell__context">{breadcrumbs}</div>
            {actions || userMenu ? (
              <div className="app-shell__actions">
                {actions}
                {userMenu}
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
