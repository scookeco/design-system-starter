import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * App build: the portal as a standalone web app (index.html → src/main.tsx), beside the library
 * build in vite.config.ts, which stays as it is. `npm run dev:app` serves it, `npm run build:app`
 * writes dist-app/ (never dist/, which the size budgets read), `npm run preview:app` serves that.
 * Both servers answer every unknown path with index.html, so a deep link loads the app, which routes it.
 * public/ holds MSW's service worker for the mock API (VITE_API_MOCKS; see src/main.tsx).
 */
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist-app',
    emptyOutDir: true,
    sourcemap: true,
  },
});
