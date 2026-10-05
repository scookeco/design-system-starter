import { existsSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';
import { docsPages, MODAL_OPEN_EXCEPTIONS, openDocs, openStory, runAxe, STEPS, stories, THEMES } from './storybook';
import { runChecks } from './wcag22-run';

/**
 * One test per story per theme, generated from the built Storybook's index.json, so a new story or
 * Docs tab is covered without touching this file. Each test loads the story once and runs, in order:
 *
 *   @visual   the full-page screenshot
 *   @a11y     axe (both themes: colour contrast differs between them)
 *   @wcag22   the WCAG 2.2 checks beyond axe (light only: none depends on colour). Last, because
 *             the focus-not-obscured check tabs through the page, opening tooltips and scrolling.
 *
 * One load instead of five per story (two screenshots, two axe runs, one WCAG 2.2 pass), with the
 * same checks. Failures are soft, so a screenshot diff still reports the axe result after it.
 * `--grep @a11y` (or VISUAL_STEPS=a11y) runs that step alone: see STEPS in ./storybook.
 */

/**
 * True when there is a baseline to compare against. Against committed baselines, the platform's
 * directory must hold screenshots (none yet: skip, don't write them from whatever is checked out).
 * Against the native reference (VISUAL_SNAPSHOT_DIR, scripts/visual-reference.ts), this story's own
 * file must exist: a story new on this branch has nothing at the merge base to compare with.
 */
const hasBaselines = (snapshotPath: string) => {
  if (process.env.VISUAL_SNAPSHOT_DIR) return existsSync(snapshotPath);
  const dir = dirname(snapshotPath);
  return existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.png'));
};

const violations = (results: Awaited<ReturnType<typeof runAxe>>) =>
  results.violations.map((v) => `${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`);

for (const story of stories) {
  for (const theme of THEMES) {
    const tags = ['@visual', '@a11y', ...(theme === 'light' ? ['@wcag22'] : [])];
    test(`${story.title} / ${story.name} [${theme}] ${tags.join(' ')}`, async ({ page }, testInfo) => {
      // Screenshot, axe and the WCAG 2.2 checks share the test: each keeps its own budget.
      test.setTimeout(120_000);
      await openStory(page, story.id, theme);

      if (STEPS.visual) {
        const name = `${story.id}--${theme}.png`;
        const updating = testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed';
        if (!updating && !hasBaselines(testInfo.snapshotPath(name))) {
          testInfo.annotations.push({
            type: 'notice',
            description: process.env.VISUAL_SNAPSHOT_DIR
              ? `${story.id} [${theme}] is new since the merge base: no reference screenshot to compare with.`
              : `No ${process.platform} baselines yet, so no screenshot. Run the "Update visual baselines" workflow (CI) or "npm run test:visual:update" (local).`,
          });
        } else {
          // Tall pages (Foundations run to ~5,000px) need longer than the 5s default to produce two
          // identical full-page captures on a CI runner.
          await expect.soft(page).toHaveScreenshot(name, { fullPage: true, timeout: 30_000 });
        }
      }

      if (STEPS.a11y) {
        const results = await runAxe(page, story.tags?.includes('modal-open') ? MODAL_OPEN_EXCEPTIONS : []);
        expect.soft(violations(results), `axe violations in ${story.id} [${theme}]`).toEqual([]);
      }

      if (STEPS.wcag22 && theme === 'light') {
        const results = await runChecks(page, story);
        const summary = Object.entries(results).flatMap(([id, found]) => found.map((v) => `${id}: ${v}`));
        expect.soft(summary, `WCAG 2.2 violations in ${story.id}`).toEqual([]);
      }
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
    expect(violations(await runAxe(page, [])), `axe violations in ${docs.id}`).toEqual([]);
  });
}
