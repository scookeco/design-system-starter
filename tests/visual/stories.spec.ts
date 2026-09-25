import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * One screenshot test and one axe test per story per theme, generated from the
 * built Storybook's index.json, so a new story is covered without touching this file.
 */

interface IndexEntry {
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
const index = JSON.parse(readFileSync(indexPath, 'utf8')) as { entries: Record<string, IndexEntry> };
const stories = Object.values(index.entries).filter((e) => e.type === 'story' && !e.tags?.includes('no-visual'));
if (stories.length === 0) throw new Error('index.json lists no stories');

const THEMES = ['light', 'dark'] as const;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Stories tagged `modal-open` render a modal layer (Dialog, open Select). Radix marks the
 * rest of the page aria-hidden and traps focus inside the layer, so the hidden, focusable
 * page behind it is unreachable. axe's aria-hidden-focus cannot see the trap; relax that one
 * rule for those stories only.
 */
const MODAL_OPEN_EXCEPTIONS = ['aria-hidden-focus'];

const openStory = async (page: Page, id: string, theme: (typeof THEMES)[number]) => {
  await page.goto(`/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=theme:${theme}`);
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
  await page.evaluate(() => document.fonts.ready);
};

/** Storybook's a11y addon also runs axe after render; wait our turn (up to ~30s) instead of colliding. */
const runAxe = async (page: Page, disabledRules: string[]) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(disabledRules).analyze();
    } catch (error) {
      if (attempt >= 60 || !/Axe is already running/.test(String(error))) throw error;
      await page.waitForTimeout(500);
    }
  }
};

/** True when the baseline directory the config resolves to already holds screenshots. */
const hasBaselines = (snapshotPath: string) => {
  const dir = dirname(snapshotPath);
  return existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.png'));
};

for (const story of stories) {
  for (const theme of THEMES) {
    test(`${story.title} / ${story.name} [${theme}] @visual`, async ({ page }, testInfo) => {
      const name = `${story.id}--${theme}.png`;
      const updating = testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed';
      if (!updating && !hasBaselines(testInfo.snapshotPath(name))) {
        testInfo.annotations.push({
          type: 'notice',
          description: `No ${process.platform} baselines yet. Run the "Update visual baselines" workflow (CI) or "npm run test:visual:update" (local).`,
        });
        test.skip(true, `no ${process.platform} baselines yet`);
      }
      await openStory(page, story.id, theme);
      await expect(page).toHaveScreenshot(name, { fullPage: true });
    });

    test(`${story.title} / ${story.name} [${theme}] @a11y`, async ({ page }) => {
      await openStory(page, story.id, theme);
      const results = await runAxe(page, story.tags?.includes('modal-open') ? MODAL_OPEN_EXCEPTIONS : []);
      const summary = results.violations.map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`);
      expect(summary, `axe violations in ${story.id} [${theme}]`).toEqual([]);
    });
  }
}
