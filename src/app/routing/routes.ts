/**
 * The route table is the master registry: every screen is one entry, `path → layout + page +
 * guard`. The router matches the URL against it, the guard asks `can` for the route's capability,
 * and pages load lazily, one chunk per route. An unknown path is the table's own fallback (404).
 *
 * This file is the generic part: the entry type and the matcher. The example app's table lives
 * beside its pages (src/examples/routes.tsx), so the app layer never imports the examples.
 */
import type { ComponentType } from 'react';
import type { Capability } from '../api/schemas';

/**
 * The frame a page renders in: `shell` is AppShell (signed-in pages, with the nav); `focused` is
 * FocusedLayout (a multi-step task with an exit). Pages compose their frame themselves, because they
 * fill its slots (breadcrumbs, the sticky footer), so this is declared, not applied: it keeps each
 * row readable as path → layout + page + guard, and says which frame a new page must compose.
 */
export type RouteLayout = 'shell' | 'focused';

/** What every routed page receives: the path's named segments (/records/:id → { id }). */
export interface RouteProps {
  params: Readonly<Record<string, string>>;
}

export interface Route {
  /** "/records/:id". Segments starting with ":" are params; everything else matches exactly. */
  path: string;
  layout: RouteLayout;
  /** Lazy by default (React.lazy), so each route is its own chunk. */
  page: ComponentType<RouteProps>;
  /** Required: a route with no capability doesn't compile (deny by default). */
  guard: Capability;
  /** The primary nav item the page belongs under (for the shell's current item). */
  nav: string;
}

/** Match one pattern against a path: the params, or undefined. Trailing slashes are ignored. */
export const matchPath = (pattern: string, pathname: string): Record<string, string> | undefined => {
  const split = (path: string) => path.split('/').filter(Boolean);
  const want = split(pattern);
  const have = split(pathname);
  if (want.length !== have.length) return undefined;
  const params: Record<string, string> = {};
  for (const [i, segment] of want.entries()) {
    const actual = have[i] as string;
    if (segment.startsWith(':')) params[segment.slice(1)] = decodeURIComponent(actual);
    else if (segment !== actual) return undefined;
  }
  return params;
};

/** The first route whose path matches, in table order (so /records/new sits before /records/:id). */
export const matchRoute = (routes: readonly Route[], pathname: string) => {
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params) return { route, params };
  }
  return undefined;
};
