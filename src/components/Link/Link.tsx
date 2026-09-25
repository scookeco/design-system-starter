import { createContext, useContext, type ComponentPropsWithRef, type ComponentType, type ReactNode } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import './Link.css';

/**
 * What the system hands an app's link component: every anchor prop, with `href` always set
 * and `ref` included. The component must spread the rest onto its anchor and forward `ref`
 * (tooltips and focus management attach to it).
 */
export type LinkComponentProps = Omit<ComponentPropsWithRef<'a'>, 'href'> & { href: string };

/** An app's router link, adapted to take `href`: React Router's `<Link to>`, Next's `<Link href>`. */
export type LinkComponent = ComponentType<LinkComponentProps>;

const LinkContext = createContext<LinkComponent | null>(null);

export interface LinkProviderProps {
  /** The app's router link, adapted to LinkComponentProps. */
  component: LinkComponent;
  children: ReactNode;
}

/**
 * Injects the app's router link once, at the root. Every system link (Link, Nav, NavTabs,
 * Breadcrumbs) then routes client-side. Without a provider they render a plain <a>.
 */
export function LinkProvider({ component, children }: LinkProviderProps) {
  return <LinkContext value={component}>{children}</LinkContext>;
}

/**
 * Internal: an anchor rendered through the provided router link, or a plain <a>. System
 * components that render links use this; it is not exported from the public entry.
 */
export function RouterLink(props: LinkComponentProps) {
  const Component = useContext(LinkContext);
  return Component ? <Component {...props} /> : <a {...props} />;
}

export type LinkProps = Closed<Omit<ComponentPropsWithRef<'a'>, 'href' | 'children'>> & {
  /** Destination. Routed through the app's LinkProvider, when there is one. */
  href: string;
  /** Link text that makes sense out of context ("View invoice INV-2041", not "click here"). */
  children: ReactNode;
};

/** An inline or standalone text link, styled from tokens and routed through LinkProvider. */
export function Link({ UNSAFE_className, UNSAFE_style, ...rest }: LinkProps) {
  return <RouterLink {...rest} className={cx('link', UNSAFE_className)} style={UNSAFE_style} />;
}
