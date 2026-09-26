/**
 * The app layer's providers: the server cache and the active tenant. A product mounts this once at
 * its root, inside the design system's LocaleProvider and LinkProvider.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { Session, Tenant } from './api/schemas';
import { SessionProvider } from './session';
import { TenantProvider } from './tenant';
import type { UrlHistory } from './url/history';
import { HistoryProvider } from './url/useUrlState';

/**
 * The cache policy, chosen once: a query cache (not a normalized store), because this is
 * server-driven CRUD with server-side paging and filtering. Data is fresh for 30s, refetched on
 * window focus, and a failed read retries once.
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 },
      mutations: { retry: false },
    },
  });

export interface AppProvidersProps {
  /** Who is signed in and what they may do in each workspace. Loaded once, before the app mounts. */
  session: Session;
  tenant: Tenant;
  /** Pass one to share or inspect the cache (tests, stories); otherwise each mount makes its own. */
  queryClient?: QueryClient;
  /** Where URL state lives. The browser's history by default; stories and tests pass a memory history. */
  history?: UrlHistory;
  children: ReactNode;
}

export function AppProviders({ session, tenant, queryClient, history, children }: AppProvidersProps) {
  const [ownClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient ?? ownClient}>
      <SessionProvider session={session}>
        {/* A tenant switch remounts everything below: selections, drafts and in-flight work stay with the old tenant. */}
        <TenantProvider key={tenant} tenant={tenant}>
          {history ? <HistoryProvider history={history}>{children}</HistoryProvider> : children}
        </TenantProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
