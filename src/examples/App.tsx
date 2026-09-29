/**
 * GOLDEN EXAMPLE: the app, assembled. The router link goes to the design system once (LinkProvider
 * with AppLink), the route table decides what renders for each URL, every route passes its guard
 * (the same `can` as buttons and mutations), and an unknown path gets the 404 page. A page that
 * throws while rendering shows the error state in its place, inside the shell (RenderErrorPage), and
 * is reported to the telemetry sink; so does a page whose code failed to load, where Try again fetches
 * it again and a second failure offers a full reload. If the shell itself fails, the app-wide
 * boundary shows the error page.
 * Mount it inside AppProviders, which a product does once at its root with the session it loaded.
 */
import { LinkProvider } from '../index';
import { AppLink } from '../app/routing/AppLink';
import { RenderBoundary } from '../app/routing/RenderBoundary';
import { RouteView } from '../app/routing/RouteView';
import { NotFoundPage, RenderErrorPage, ServerErrorPage } from './ErrorPages';
import { Guard } from './Permission';
import { ROUTES } from './routes';

export function ExampleApp() {
  return (
    <LinkProvider component={AppLink}>
      {/* The last resort: if the shell itself fails, the error page that needs no shell. */}
      <RenderBoundary region="app" fallback={() => <ServerErrorPage />}>
        <RouteView
          routes={ROUTES}
          notFound={<NotFoundPage />}
          guard={(route, page) => (
            <Guard capability={route.guard} current={route.nav}>
              {page}
            </Guard>
          )}
          renderError={(route, retry, failure) => <RenderErrorPage current={route.nav} onRetry={retry} cause={failure.cause} repeated={failure.repeated} />}
        />
      </RenderBoundary>
    </LinkProvider>
  );
}
