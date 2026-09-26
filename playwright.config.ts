import { defineConfig, devices } from '@playwright/test';

// PLAYWRIGHT_PORT lets parallel checkouts each serve their own storybook-static.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 6007);
const CI = Boolean(process.env.CI);

/**
 * Visual regression and axe over every story of the built Storybook.
 *
 * Baselines are per platform ({platform} in the path). Linux baselines, produced by
 * the "Update visual baselines" workflow, are committed and are the source of truth.
 * Local darwin/win32 baselines are gitignored.
 */
export default defineConfig({
  testDir: 'tests/visual',
  snapshotPathTemplate: 'tests/visual/__screenshots__/{platform}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: CI,
  retries: 0,
  workers: CI ? 4 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  // In CI a missing baseline is a failure, never silently written.
  updateSnapshots: CI ? 'none' : 'missing',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        deviceScaleFactor: 1,
        // Byte-stable screenshots. By default Chromium re-rasterizes only the invalidated part of a
        // tile when something repaints (a button leaving its pending state, a dialog opening over
        // the page), and the antialiasing of a rounded border or a glyph edge that straddles that
        // rect can then differ by a level or two from a full raster of the same frame. Which one a
        // capture gets depends on paint timing, so a settled story could produce two different
        // PNGs. Full rasters only: every capture of the same frame is the same bytes.
        launchOptions: { args: ['--disable-partial-raster'] },
      },
    },
  ],
  webServer: {
    command: `npx vite preview --outDir storybook-static --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}/index.json`,
    reuseExistingServer: !CI,
  },
});
