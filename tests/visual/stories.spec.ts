import { existsSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';
import { docsPages, MODAL_OPEN_EXCEPTIONS, openDocs, openStory, runAxe, stories, THEMES } from './storybook';

/**
 * One screenshot test and one axe test per story per theme, plus one axe test per Docs tab,
 * generated from the built Storybook's index.json, so a new story or Docs tab is covered
 * without touching this file.
 */

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
      // Tall pages (Foundations run to ~5,000px) need longer than the 5s default to produce two
      // identical full-page captures on a CI runner.
      await expect(page).toHaveScreenshot(name, { fullPage: true, timeout: 30_000 });
    });

    test(`${story.title} / ${story.name} [${theme}] @a11y`, async ({ page }) => {
      await openStory(page, story.id, theme);
      const results = await runAxe(page, story.tags?.includes('modal-open') ? MODAL_OPEN_EXCEPTIONS : []);
      const summary = results.violations.map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`);
      expect(summary, `axe violations in ${story.id} [${theme}]`).toEqual([]);
    });
  }
}

/**
 * Docs tabs get axe, not screenshots: the page is mostly Storybook's own chrome, and every
 * story on it is already captured on its own. Docs tabs render light only (see .storybook/preview.tsx).
 */
for (const docs of docsPages) {
  test(`${docs.title} / ${docs.name} [light] @a11y`, async ({ page }) => {
    await openDocs(page, docs.id);
    const results = await runAxe(page, []);
    const summary = results.violations.map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`);
    expect(summary, `axe violations in ${docs.id}`).toEqual([]);
  });
}
