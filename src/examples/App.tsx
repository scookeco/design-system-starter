/**
 * GOLDEN EXAMPLE: the app, assembled. The router link goes to the design system once (LinkProvider
 * with AppLink), the route table decides what renders for each URL, every route passes its guard
 * (the same `can` as buttons and mutations), and an unknown path gets the 404 page. Mount it inside
 * AppProviders, which a product does once at its root with the session it loaded.
 */
import { LinkProvider } from '../index';
import { AppLink } from '../app/routing/AppLink';
import { RouteView } from '../app/routing/RouteView';
import { NotFoundPage } from './ErrorPages';
import { Guard } from './Permission';
import { ROUTES } from './routes';

export function ExampleApp() {
  return (
    <LinkProvider component={AppLink}>
      <RouteView
        routes={ROUTES}
        notFound={<NotFoundPage />}
        guard={(route, page) => (
          <Guard capability={route.guard} current={route.nav}>
            {page}
          </Guard>
        )}
      />
    </LinkProvider>
  );
}
