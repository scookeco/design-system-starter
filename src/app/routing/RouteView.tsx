/**
 * Renders the route the URL matches: guarded, lazily loaded, or the 404 when nothing matches.
 * The Suspense fallback is deliberately nothing: pages show their own skeletons once their code is
 * here, and a route that loads in a few milliseconds shouldn't flash a spinner.
 */
import { Suspense, type ReactNode } from 'react';
import { usePathname } from '../url/useUrlState';
import { matchRoute, type Route } from './routes';

export interface RouteViewProps {
  routes: readonly Route[];
  /** Rendered when no route matches: the table's own fallback. */
  notFound: ReactNode;
  /** The route guard: given the matched route and its page, renders the page or the 403 page in its place. */
  guard: (route: Route, page: ReactNode) => ReactNode;
}

export function RouteView({ routes, notFound, guard }: RouteViewProps) {
  const pathname = usePathname();
  const match = matchRoute(routes, pathname);
  if (!match) return <>{notFound}</>;
  const Page = match.route.page;
  return (
    <>
      {guard(
        match.route,
        <Suspense fallback={null}>
          {/* Keyed by the path, so moving between two records starts the page afresh. */}
          <Page key={pathname} params={match.params} />
        </Suspense>,
      )}
    </>
  );
}
