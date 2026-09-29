import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { SEED_EPOCH } from '../../src/app/mocks/seed';
import { VIEW_TRANSITIONS_ATTRIBUTE } from '../../src/app/viewTransition';

/**
 * Shared by the Playwright specs in this folder: the built Storybook's index, and how to open a
 * story or a Docs tab once it has rendered and settled. Not a spec file, so it registers no tests.
 */

export interface IndexEntry {
  id: string;
  type: 'story' | 'docs';
  title: string;
  name: string;
  tags?: string[];
}

const indexPath = resolve(import.meta.dirname, '../../storybook-static/index.json');
if (!existsSync(indexPath)) {
  throw new Error('storybook-static/index.json not found. Run "npm run build-storybook" first (npm run test:visual does).');
}
export const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { entries: Record<string, IndexEntry> };
export const stories = Object.values(index.entries).filter((e) => e.type === 'story' && !e.tags?.includes('no-visual'));
if (stories.length === 0) throw new Error('index.json lists no stories');
export const docsPages = Object.values(index.entries).filter((e) => e.type === 'docs');

export const THEMES = ['light', 'dark'] as const;
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Stories tagged `modal-open` render a modal layer (Dialog, open Select). Radix marks the
 * rest of the page aria-hidden and traps focus inside the layer, so the hidden, focusable
 * page behind it is unreachable. axe's aria-hidden-focus cannot see the trap; relax that one
 * rule for those stories only.
 */
export const MODAL_OPEN_EXCEPTIONS = ['aria-hidden-focus'];

/**
 * Stories render against a frozen clock, the instant the mock data was seeded for, so relative
 * times ("3 days ago") never drift. Only Date is fixed; timers and animation frames run normally.
 */
export const FROZEN_NOW = new Date(SEED_EPOCH);

/**
 * Turn the example app's view transitions off (src/app/viewTransition.ts reads the attribute) before
 * any of the page's scripts run. Playwright's animations: 'disabled' doesn't reach view
 * transitions, and reduced motion alone would leave determinism to one media query; with the flag,
 * a navigation in a story or a spec swaps the view at once and a capture sees only the end state.
 */
export const disableViewTransitions = (page: Page) =>
  page.addInitScript((attribute) => {
    const set = () => document.documentElement.setAttribute(attribute, 'off');
    if (document.documentElement) set();
    else document.addEventListener('readystatechange', set, { once: true });
  }, VIEW_TRANSITIONS_ATTRIBUTE);

/**
 * Open a story once it has rendered and settled. Every spec gets the same determinism: the mock
 * API answers instantly and never fails (latency:0;failure:0, whatever the gallery's toolbar
 * defaults), the signed-in role is admin unless the story sets its own (role:admin), the clock is frozen, view transitions are off (html[data-view-transitions="off"]),
 * and stories tagged `data` wait until their queries settle (html[data-queries-settled]). `busy`
 * stories hold a request open on purpose and aren't waited on.
 */
export const openStory = async (page: Page, id: string, theme: (typeof THEMES)[number]) => {
  const tags = index.entries[id]?.tags ?? [];
  await page.clock.setFixedTime(FROZEN_NOW);
  await disableViewTransitions(page);
  await page.goto(`/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=theme:${theme};latency:0;failure:0;role:admin`);
  await page.waitForFunction(() => document.body.classList.contains('sb-show-main'));
  // Rendered into the root, or (overlay-only stories) into a portal beside it.
  await page.waitForFunction(() => {
    const root = document.getElementById('storybook-root');
    if (root && root.childElementCount > 0) return true;
    return [...document.body.children].some(
      (el) => !['storybook-root', 'storybook-docs'].includes(el.id) && el.tagName !== 'SCRIPT' && !String(el.className).startsWith('sb-'),
    );
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).toHaveAttribute(VIEW_TRANSITIONS_ATTRIBUTE, 'off');
  if (tags.includes('data') && !tags.includes('busy')) await expect(page.locator('html')).toHaveAttribute('data-queries-settled', 'true');
  await page.evaluate(() => document.fonts.ready);
  await waitForStableHeight(page);
};

/**
 * Wait until the document height has not changed for several frames. Slow runners can still be
 * laying out tall pages when capture starts, and a full-page screenshot of a page that is still
 * growing never matches its own next capture.
 *
 * With `boxes`, every element matching that selector must also keep its scroll and client size:
 * a box that overflows for a frame while its content lays out is, to axe, a scrollable region.
 */
export const waitForStableHeight = (page: Page, boxes?: string) =>
  page.evaluate(
    (selector) =>
      new Promise<void>((resolve) => {
        const measure = () =>
          [document.documentElement.scrollHeight, ...(selector ? [...document.querySelectorAll(selector)] : []).map((el) => `${String(el.scrollHeight)}/${String(el.clientHeight)}/${String(el.scrollWidth)}/${String(el.clientWidth)}`)].join(' ');
        let last = '';
        let steady = 0;
        const started = performance.now();
        const tick = () => {
          const now = measure();
          steady = now === last ? steady + 1 : 0;
          last = now;
          if (steady >= 10 || performance.now() - started > 10_000) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    boxes,
  );

/**
 * A Docs tab: the page, then every inline story on it, rendered and laid out. On the first frame
 * some previews still overflow their box (a Disabled story by 30px): axe, running then, reports a
 * scrollable region with nothing focusable in it, so wait until every preview keeps its size.
 */
export const openDocs = async (page: Page, id: string) => {
  await page.goto(`/iframe.html?id=${encodeURIComponent(id)}&viewMode=docs&globals=theme:light`);
  await page.waitForFunction(() => document.body.classList.contains('sb-show-main'));
  await page.locator('#storybook-docs .sbdocs-content').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('#storybook-docs .sb-story')].every((el) => el.childElementCount > 0));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => document.fonts.ready);
  await waitForStableHeight(page, '#storybook-docs .docs-story');
};

/** Storybook's a11y addon also runs axe after render; wait our turn (up to ~30s) instead of colliding. */
export const runAxe = async (page: Page, disabledRules: string[]) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(disabledRules).analyze();
    } catch (error) {
      if (attempt >= 60 || !/Axe is already running/.test(String(error))) throw error;
      await page.waitForTimeout(500);
    }
  }
};
