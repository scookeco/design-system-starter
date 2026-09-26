/**
 * The app layer's providers: the server cache, the session and the active workspace (tenant). A product mounts this once at
 * its root, inside the design system's LocaleProvider and LinkProvider.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { LiveSource } from './api/live';
import type { Session, Tenant } from './api/schemas';
import { useLiveSubscription } from './model/live';
import { SessionProvider } from './session';
import type { UrlHistory } from './url/history';
import { HistoryProvider } from './url/useUrlState';

/**
 * The cache policy, chosen once: a query cache (not a normalized store), because this is
 * server-driven CRUD with server-side paging and filtering. Keeping it fresh (src/app/model/live.ts):
 * data is fresh for 30 s, so moving between pages doesn't refetch what was just read; after that,
 * returning to the window or coming back online refetches what's on screen. A failed read retries
 * once. Live events, when a source is passed, patch in between.
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: true, refetchOnReconnect: true, retry: 1 },
      mutations: { retry: false },
    },
  });

export interface AppProvidersProps {
  /** Who is signed in and what they may do in each workspace. Loaded once, before the app mounts. */
  session: Session;
  /** The workspace to open in. The person can switch to any other they're a member of. */
  tenant: Tenant;
  /** Shown once the person signs out (a sign-in page). */
  signedOut?: ReactNode;
  /** Pass one to share or inspect the cache (tests, stories); otherwise each mount makes its own. */
  queryClient?: QueryClient;
  /** Where URL state lives. The browser's history by default; stories and tests pass a memory history. */
  history?: UrlHistory;
  /**
   * Where live events come from (src/app/api/live.ts): `eventSourceLive()` in a product, the mock
   * channel in the gallery and tests. Without one, the cache relies on focus and reconnect refetches.
   */
  live?: LiveSource;
  children: ReactNode;
}

/** Subscribes for the active workspace. Rendered inside the tenant boundary, so a switch or sign-out unsubscribes. */
function LiveSubscription({ source }: { source: LiveSource | undefined }) {
  useLiveSubscription(source);
  return null;
}

export function AppProviders({ session, tenant, signedOut, queryClient, history, live, children }: AppProvidersProps) {
  const [ownClient] = useState(createQueryClient);
  const routed = history ? <HistoryProvider history={history}>{children}</HistoryProvider> : children;
  const content = (
    <>
      <LiveSubscription source={live} />
      {routed}
    </>
  );
  return (
    <QueryClientProvider client={queryClient ?? ownClient}>
      <SessionProvider session={session} tenant={tenant} signedOut={history ? <HistoryProvider history={history}>{signedOut}</HistoryProvider> : signedOut}>
        {content}
      </SessionProvider>
    </QueryClientProvider>
  );
}
