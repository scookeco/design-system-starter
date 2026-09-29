/**
 * Renders the route the URL matches: guarded, lazily loaded (lazyPage), or the 404 when nothing matches.
 * The Suspense fallback is deliberately nothing: pages show their own skeletons once their code is
 * here, and a route that loads in a few milliseconds shouldn't flash a spinner.
 *
 * Every page renders inside its own error boundary (RenderBoundary): a renderer that throws shows
 * `renderError` in the page's place, reported to the telemetry sink under the route's path pattern,
 * and the rest of the app keeps working. Moving to another path starts a fresh boundary. A page whose
 * code failed to load shows `renderError` too, told so (`failure.cause` is `load`): its Try again
 * fetches the code again, and a second failure in a row is `repeated` (offer a full reload).
 */
import { Suspense, type ReactNode } from 'react';
import { usePathname } from '../url/useUrlState';
import { RenderBoundary, type RenderFailure } from './RenderBoundary';
import { matchRoute, type Route } from './routes';

export interface RouteViewProps {
  routes: readonly Route[];
  /** Rendered when no route matches: the table's own fallback. */
  notFound: ReactNode;
  /** The route guard: given the matched route and its page, renders the page or the 403 page in its place. */
  guard: (route: Route, page: ReactNode) => ReactNode;
  /**
   * Rendered in the page's place when it throws while rendering, or its code failed to load: the
   * error state, inside the shell, with `retry` (render the page again, fetching its code again if
   * that is what failed) and what failed. Without one, the error goes on up to the nearest boundary.
   */
  renderError?: (route: Route, retry: () => void, failure: RenderFailure) => ReactNode;
}

export function RouteView({ routes, notFound, guard, renderError }: RouteViewProps) {
  const pathname = usePathname();
  const match = matchRoute(routes, pathname);
  if (!match) return <>{notFound}</>;
  const { route } = match;
  const Page = route.page;
  const guarded = guard(
    route,
    <Suspense fallback={null}>
      {/* Keyed by the path, so moving between two records starts the page afresh. */}
      <Page key={pathname} params={match.params} />
    </Suspense>,
  );
  if (!renderError) return <>{guarded}</>;
  return (
    // Keyed by the path too: a failure on one record doesn't follow the person to the next.
    <RenderBoundary key={pathname} region={route.path} fallback={(retry, failure) => renderError(route, retry, failure)}>
      {guarded}
    </RenderBoundary>
  );
}
