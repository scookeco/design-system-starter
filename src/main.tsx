/**
 * The browser entry (index.html loads it): reads the build's settings, then starts the app
 * (src/bootstrap.tsx). `npm run dev:app` serves it, `npm run build:app` builds it into dist-app/.
 *
 *   VITE_API_MOCKS      "true" or "false". On by default in the dev server, off in a build: the mock
 *                       API (src/app/mocks/browser.ts) is then left out of the bundle entirely.
 *   VITE_API_BASE_URL   the backend's base URL (configureApi). Unset: `/api` on the page's origin.
 *
 * Set them in the shell or in a `.env.local` file (Vite's env files).
 */
import { startApp } from './bootstrap';

// Read as written (import.meta.env.X), so Vite replaces each at build time and a build without
// mocks drops the dynamic import below, and with it the mock API's chunk.
const mocks = import.meta.env.VITE_API_MOCKS ? import.meta.env.VITE_API_MOCKS === 'true' : import.meta.env.DEV;
const baseUrl = import.meta.env.VITE_API_BASE_URL;
const container = document.getElementById('root');
if (!container) throw new Error('index.html has no #root element.');

void startApp({
  container,
  ...(baseUrl ? { baseUrl } : {}),
  ...(mocks ? { startMocks: async () => (await import('./app/mocks/browser')).startMockApi(`${import.meta.env.BASE_URL}mockServiceWorker.js`) } : {}),
  locale: navigator.language,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
