/**
 * Test harness for app-layer code: the mock API on msw/node, a fresh database per test, and a
 * render helper that mounts a component inside the app providers with its own cache.
 */
import { QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import { setupServer } from 'msw/node';
import type { ReactElement } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import type { Tenant } from '../../src/app/api/schemas';
import { configureMocks } from '../../src/app/mocks/config';
import { resetDb } from '../../src/app/mocks/db';
import { handlers } from '../../src/app/mocks/handlers';
import { AppProviders } from '../../src/app/providers';

export const server = setupServer(...handlers);

/** Call once at the top of a test file that talks to the mock API. */
export const setupMockApi = () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    resetDb();
    configureMocks({ latencyMs: 0, failureRate: 0, random: Math.random });
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

export const testClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });

export const renderWithApp = (ui: ReactElement, { tenant = 'acme', client = testClient() }: { tenant?: Tenant; client?: QueryClient } = {}): RenderResult & { client: QueryClient } => ({
  ...render(
    <AppProviders tenant={tenant} queryClient={client}>
      {ui}
    </AppProviders>,
  ),
  client,
});
