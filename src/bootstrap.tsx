/**
 * The app's start-up, shared by the browser entry (src/main.tsx) and its test
 * (tests/unit/app-entry.test.tsx). In order:
 *
 *   1. base URL   configureApi({ baseUrl }) when one is given (VITE_API_BASE_URL); `/api` otherwise
 *   2. mock API   when asked (VITE_API_MOCKS), start it and wait until it answers
 *   3. session    GET /session, parsed by SessionSchema; the first workspace opens
 *   4. mount      ExampleApp inside LocaleProvider and AppProviders, as the stories and tests mount it
 *
 * Sign-in: no provider is chosen (README, "The sign-in seam"). A provider hooks in at step 3: it
 * completes sign-in first (a redirect, or a silent token refresh), then getSession() loads the
 * session. A 401 renders the sign-in page, which starts the provider's flow; sign-out stays in
 * `signOut` (src/app/session.tsx), and request headers or cookies in request() (src/app/api/client.ts).
 */
import { StrictMode, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LocaleProvider } from './index';
import { ApiError, configureApi } from './app/api/client';
import type { LiveSource } from './app/api/live';
import { getSession } from './app/api/session';
import { AppProviders } from './app/providers';
import { ExampleApp } from './examples/App';
import { ServerErrorPage } from './examples/ErrorPages';
import { SignInPage } from './examples/SignInPage';

export interface StartAppOptions {
  /** The element the app renders into. */
  container: Element;
  /** Where the API lives. Omit it for `/api` on the page's own origin. */
  baseUrl?: string;
  /**
   * Starts the mock API and resolves once it answers, with the live source it feeds. Omit it to
   * talk to the real backend. The browser entry passes MSW's service worker; the test passes msw/node.
   */
  startMocks?: () => Promise<{ live: LiveSource }>;
  /** Formatting locale and time zone (LocaleProvider). The browser entry passes the browser's own. */
  locale?: string;
  timeZone?: string;
}

/** Loads the session, then mounts the app. Resolves with the React root (tests unmount it). */
export async function startApp({ container, baseUrl, startMocks, locale, timeZone }: StartAppOptions): Promise<Root> {
  if (baseUrl) configureApi({ baseUrl });
  // Live events: the mock channel with mocks. A real backend's stream is eventSourceLive()
  // (src/app/api/live.ts), passed here once it serves /t/:tenant/events.
  const live = startMocks ? (await startMocks()).live : undefined;

  const root = createRoot(container);
  const mount = (content: ReactNode) =>
    root.render(
      <StrictMode>
        <LocaleProvider {...(locale ? { locale } : {})} {...(timeZone ? { timeZone } : {})}>
          {content}
        </LocaleProvider>
      </StrictMode>,
    );

  try {
    const session = await getSession();
    const tenant = session.memberships[0]?.tenant;
    if (!tenant) throw new Error('The session has no workspace to open.');
    mount(
      <AppProviders session={session} tenant={tenant} signedOut={<SignInPage />} {...(live ? { live } : {})}>
        <ExampleApp />
      </AppProviders>,
    );
  } catch (error) {
    // Not signed in: the sign-in page (a provider's flow starts there). Anything else: the error page.
    if (error instanceof ApiError && error.status === 401) {
      mount(<SignInPage />);
    } else {
      console.error(error);
      mount(<ServerErrorPage />);
    }
  }
  return root;
}
