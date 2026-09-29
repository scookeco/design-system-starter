/**
 * The mock API in a browser tab, for the app entry (src/main.tsx): MSW's service worker
 * (public/mockServiceWorker.js) answers `…/api/…` from the in-memory database, and the in-process
 * live channel stands in for the server's event stream. The entry loads this module with a dynamic
 * import only when VITE_API_MOCKS is on, so a build without mocks carries none of it.
 *
 * The gallery starts its own worker (msw-storybook-addon, .storybook/public) and the tests use
 * msw/node (tests/unit/app-harness.tsx); both keep working without this file.
 */
import { setupWorker } from 'msw/browser';
import type { LiveSource } from '../api/live';
import { handlers } from './handlers';
import { mockLive } from './live';

/**
 * Registers the worker and resolves once it intercepts requests: call it before the app's first
 * request. `workerUrl` is absolute (`${BASE_URL}mockServiceWorker.js`), so a deep link still finds it.
 * Requests the handlers don't know (Vite's modules, a real backend's routes) pass through untouched.
 */
export const startMockApi = async (workerUrl: string): Promise<{ live: LiveSource }> => {
  await setupWorker(...handlers).start({ serviceWorker: { url: workerUrl }, onUnhandledRequest: 'bypass' });
  return { live: mockLive };
};
