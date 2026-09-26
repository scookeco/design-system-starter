/**
 * The router link the app hands the design system once, through LinkProvider: an anchor that
 * navigates in-app for a plain click on an internal path, and leaves everything else (a new tab, a
 * modified click, an external URL) to the browser. Every system link (Link, Nav, NavTabs,
 * Breadcrumbs) then routes through the app's history.
 */
import type { LinkComponentProps } from '../../index';
import { useNavigate } from '../url/useUrlState';

export function AppLink({ href, onClick, target, ...rest }: LinkComponentProps) {
  const navigate = useNavigate();
  return (
    <a
      {...rest}
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
        if (event.defaultPrevented || modified || target || !href.startsWith('/')) return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
