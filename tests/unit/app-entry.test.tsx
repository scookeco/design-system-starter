// @vitest-environment jsdom
/**
 * The app entry (src/bootstrap.tsx, which src/main.tsx calls with the build's settings): it starts
 * the mock API before the first request, loads the session, and mounts the route table at the
 * browser's own URL. The mock API here is msw/node standing in for the service worker the browser
 * entry starts (src/app/mocks/browser.ts); what the entry does with it is the same.
 */
import { act, cleanup, screen } from '@testing-library/react';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApi } from '../../src/app/api/client';
import { endSession } from '../../src/app/mocks/db';
import { mockLive, subscriberCount } from '../../src/app/mocks/live';
import { seedRecords } from '../../src/app/mocks/seed';
import { startApp, type StartAppOptions } from '../../src/bootstrap';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, server, setupMockApi } from './app-harness';

setupMockApi();

let root: Root | undefined;
let container: HTMLElement;
/** Every request the mock API saw, in order, with whether the mocks had started by then. */
let requests: { url: string; mocksStarted: boolean }[] = [];
let mocksStarted = false;

/** Stands in for the service worker: resolves a turn later, as registering one does. */
const startMocks = vi.fn(async () => {
  await new Promise((settle) => setTimeout(settle, 0));
  mocksStarted = true;
  return { live: mockLive };
});

const start = async (options: Omit<StartAppOptions, 'container'> = {}) => {
  await act(async () => {
    root = await startApp({ container, ...options });
  });
};

const onRequest = ({ request }: { request: Request }) => {
  requests.push({ url: request.url, mocksStarted });
};

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'));
  requests = [];
  mocksStarted = false;
  startMocks.mockClear();
  server.events.on('request:start', onRequest);
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  cleanup();
  server.events.removeListener('request:start', onRequest);
  configureApi({ baseUrl: '/api' });
  window.history.replaceState(null, '', '/');
});

describe('the app entry', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('starts the mock API before any request, loads the session from it, and renders the home route at /', async () => {
    await start({ startMocks });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' }, FIRST_PAINT)).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();

    expect(startMocks).toHaveBeenCalledTimes(1);
    expect(requests.length).toBeGreaterThan(1);
    expect(requests.every((r) => r.mocksStarted)).toBe(true);
    // The session comes first, from the API, before any workspace data.
    expect(new URL(requests[0]?.url ?? '').pathname).toBe('/api/session');
    // The mock live channel is subscribed for the workspace that opened (the first membership).
    expect(subscriberCount('acme')).toBeGreaterThan(0);
  });

  it('opens a deep link at the browser’s URL: a record page with its data', async () => {
    const record = seedRecords('acme').find((r) => r.id === 'r-1001');
    window.history.pushState(null, '', '/records/r-1001');
    await start({ startMocks });
    expect(await screen.findByRole('heading', { level: 1, name: record?.name ?? '?' }, FIRST_PAINT)).toBeTruthy();
    expect(window.location.pathname).toBe('/records/r-1001');
  });

  it('sends every request to the configured base URL', async () => {
    // The mock API answers …/api/… on any origin, so this base still reaches it.
    await start({ startMocks, baseUrl: 'https://backend.example.com/api/' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' }, FIRST_PAINT)).toBeTruthy();
    expect(requests.length).toBeGreaterThan(1);
    expect(requests.filter((r) => !r.url.startsWith('https://backend.example.com/api/'))).toEqual([]);
  });

  it('without mocks, starts none and subscribes to no live source', async () => {
    await start();
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' }, FIRST_PAINT)).toBeTruthy();
    expect(startMocks).not.toHaveBeenCalled();
    expect(subscriberCount('acme')).toBe(0);
  });

  it('renders the sign-in page when the session answers 401', async () => {
    endSession();
    await start({ startMocks });
    expect(await screen.findByRole('heading', { level: 1, name: /^Sign in/ }, FIRST_PAINT)).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
  });
});
