/**
 * Gallery wiring for stories that read from the mock API. Each story gets a fresh database and a
 * fresh cache, so no story sees another's writes, and a signal on <html> tells the visual suite
 * when the data has settled.
 */
import { QueryClient, type QueryClient as QueryClientType } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import type { Decorator } from '@storybook/react-vite';
import type { HttpHandler } from 'msw';
import type { Tenant } from '../api/schemas';
import { AppProviders } from '../providers';
import { resetDb } from './db';
import { handlers } from './handlers';

/**
 * Settled: at least one query exists, nothing is fetching or mutating, and some query has an
 * answer (data or error). This also covers the gap before the first fetch starts, and refetches
 * after a mutation invalidates. Written as html[data-queries-settled].
 */
const isSettled = (client: QueryClientType) => {
  const queries = client.getQueryCache().getAll();
  return (
    queries.length > 0 &&
    queries.every((q) => q.state.fetchStatus === 'idle') &&
    queries.some((q) => q.state.status !== 'pending') &&
    client.isMutating() === 0
  );
};

function SettledSignal({ client }: { client: QueryClientType }) {
  useEffect(() => {
    const update = () => {
      document.documentElement.dataset.queriesSettled = String(isSettled(client));
    };
    update();
    const unsubscribeQueries = client.getQueryCache().subscribe(update);
    const unsubscribeMutations = client.getMutationCache().subscribe(update);
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
      delete document.documentElement.dataset.queriesSettled;
    };
  }, [client]);
  return null;
}

/** Stories never retry and never go stale: a failure shows at once, and nothing refetches mid-capture. */
const storyClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false }, mutations: { retry: false } } });

function StoryProviders({ tenant, children }: { tenant: Tenant; children: ReactNode }) {
  const [client] = useState(storyClient);
  return (
    <AppProviders tenant={tenant} queryClient={client}>
      <SettledSignal client={client} />
      {children}
    </AppProviders>
  );
}

/** Wraps a story in the app providers for a tenant (default: acme). */
export const withMockApi =
  (tenant: Tenant = 'acme'): Decorator =>
  (Story) => (
    <StoryProviders tenant={tenant}>
      <Story />
    </StoryProviders>
  );

/**
 * Meta fields for a story file that reads from the mock API: the handlers, a reset database before
 * each story, and the `data` tag (the visual suite waits for html[data-queries-settled="true"]).
 * A story that holds a request open on purpose adds the `busy` tag, and the suite doesn't wait.
 */
export const mockApiMeta = {
  tags: ['!autodocs', 'data'],
  // `overrides` comes first so a story's overrides (parameters.msw.handlers.overrides) win over the defaults.
  parameters: { layout: 'fullscreen', msw: { handlers: { overrides: [], api: handlers } } },
  beforeEach: () => {
    resetDb();
  },
};

/** Story parameters that put these handlers in front of the defaults. */
export const mswOverrides = (...overrides: HttpHandler[]) => ({ msw: { handlers: { overrides } } });
