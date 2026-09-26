/**
 * Test harness for app-layer code: the mock API on msw/node, a fresh database per test, and a
 * render helper that mounts a component inside the app providers with its own cache.
 */
import { QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { setupServer } from 'msw/node';
import type { ReactElement, ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import type { LiveSource } from '../../src/app/api/live';
import type { Role, Tenant } from '../../src/app/api/schemas';
import { configureMocks } from '../../src/app/mocks/config';
import { draftStorage } from '../../src/app/model/drafts';
import { jobSettings } from '../../src/app/model/jobs';
import { undoSettings } from '../../src/app/model/undo';
import { currentSession, resetDb, setRoles } from '../../src/app/mocks/db';
import { aiHandlers } from '../../src/app/mocks/ai';
import { handlers } from '../../src/app/mocks/handlers';
import { AppProviders } from '../../src/app/providers';
import { createMemoryHistory, type MemoryHistory } from '../../src/app/url/history';

export const server = setupServer(...handlers, ...aiHandlers);

/** Call once at the top of a test file that talks to the mock API. */
export const setupMockApi = () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    resetDb();
    draftStorage.clearAll();
    undoSettings.windowMs = 6_000;
    // Jobs don't poll unless a test asks: it drives them itself.
    jobSettings.pollMs = Infinity;
    configureMocks({ latencyMs: 0, failureRate: 0, random: Math.random });
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

export const testClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });

/** The app's providers for a hook or a component, with the mock server's current session (admin unless setRoles says otherwise). */
export const wrapperFor =
  (client: QueryClient, tenant: Tenant = 'acme', live?: LiveSource) =>
  ({ children }: { children: ReactNode }) => (
    <AppProviders session={currentSession()} tenant={tenant} queryClient={client} {...(live ? { live } : {})}>
      {children}
    </AppProviders>
  );

export const renderWithApp = (
  ui: ReactElement,
  { tenant = 'acme', client = testClient(), url = '/', role, live }: { tenant?: Tenant; client?: QueryClient; url?: string; role?: Role; live?: LiveSource } = {},
): RenderResult & { client: QueryClient; history: MemoryHistory } => {
  const history = createMemoryHistory(url);
  if (role) setRoles(role);
  return {
    ...render(
      <AppProviders session={currentSession()} tenant={tenant} queryClient={client} history={history} {...(live ? { live } : {})}>
        {ui}
      </AppProviders>,
    ),
    client,
    history,
  };
};
