/**
 * Gallery wiring for stories that read from the mock API. Each story gets a fresh database and a
 * fresh cache, so no story sees another's writes, and a signal on <html> tells the visual suite
 * when the data has settled.
 */
import { QueryClient, type QueryClient as QueryClientType } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import type { Decorator } from '@storybook/react-vite';
import type { HttpHandler } from 'msw';
import { ROLES, type Role, type Session, type Tenant } from '../api/schemas';
import { AppProviders } from '../providers';
import { createMemoryHistory } from '../url/history';
import { currentSession, resetDb, setRoles } from './db';
import { aiHandlers } from './ai';
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

function StoryProviders({ session, tenant, url, children }: { session: Session; tenant: Tenant; url: string; children: ReactNode }) {
  const [client] = useState(storyClient);
  const [history] = useState(() => createMemoryHistory(url));
  return (
    <AppProviders session={session} tenant={tenant} queryClient={client} history={history}>
      <SettledSignal client={client} />
      {children}
    </AppProviders>
  );
}

export interface MockApiParameters {
  /** The workspace the story runs in (default acme). */
  tenant?: Tenant;
  /**
   * The signed-in person's role, in every workspace or per workspace. Wins over the gallery's Role
   * toolbar, so a story about a role always shows that role (the visual suite pins the toolbar to admin).
   */
  role?: Role | Partial<Record<Tenant, Role>>;
  /** The URL the page opens at, kept in an in-memory history so the gallery's own URL is never rewritten. */
  url?: string;
}

const toolbarRole = (value: unknown): Role => (ROLES as readonly unknown[]).includes(value) ? (value as Role) : 'admin';

/**
 * Wraps a story in the app providers, from its `parameters.mockApi`. The role goes to the mock
 * server first (it's the server that decides), and the session the app mounts with is the one the
 * server would return for it.
 */
const withMockApi: Decorator = (Story, context) => {
  const { tenant = 'acme', url = '/', role } = (context.parameters.mockApi ?? {}) as MockApiParameters;
  setRoles(role ?? toolbarRole(context.globals.role));
  return (
    <StoryProviders session={currentSession()} tenant={tenant} url={url}>
      <Story />
    </StoryProviders>
  );
};

/**
 * Meta fields for a story file that reads from the mock API: the providers, the handlers, and a
 * reset database before each story. Spread it into the meta, and write the tags out literally
 * beside it (Storybook's indexer reads tags statically, so a spread can't carry them):
 *
 *   tags: ['!autodocs', 'data']   the visual suite waits for html[data-queries-settled="true"]
 *   tags: ['busy']                on a story that holds a request open on purpose: don't wait
 */
export const mockApiMeta = {
  decorators: [withMockApi],
  // `overrides` comes first so a story's overrides (parameters.msw.handlers.overrides) win over the defaults.
  // The assistant's routes (./ai) sit beside the rest; they import the same route wrapper, so they live in their own module.
  parameters: { layout: 'fullscreen', msw: { handlers: { overrides: [], api: [...handlers, ...aiHandlers] } } },
  beforeEach: () => {
    resetDb();
  },
};

/** Story parameters that put these handlers in front of the defaults. */
export const mswOverrides = (...overrides: HttpHandler[]) => ({ msw: { handlers: { overrides } } });

/** Story parameters: open the page at this URL, in this tenant. */
export const mockApi = (settings: MockApiParameters) => ({ mockApi: settings });
