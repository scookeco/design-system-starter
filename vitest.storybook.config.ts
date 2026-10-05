/**
 * PILOT (Storybook Vitest addon): every story as a Vitest test in a real browser, with its play
 * function and axe (addon-a11y). `npm run test:stories`. Kept apart from vitest.config.ts so
 * `npm test` and `npm run check` stay jsdom-only and need no browser.
 */
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The mock API's service worker (/mockServiceWorker.js), which Storybook serves from staticDirs.
  publicDir: '.storybook/public',
  plugins: [
    storybookTest({
      configDir: '.storybook',
      // The WCAG 2.2 check fixtures are built to fail; the Playwright suite skips them too.
      tags: { exclude: ['check-fixture'] },
    }),
  ],
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['.storybook/vitest.setup.ts'],
  },
});
