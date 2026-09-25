import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { index, openStory, stories, type IndexEntry } from './storybook';
import { accessibleAuthenticationViolations, CHECKS, focusObscuredViolation, targetSizeViolations, type CheckId } from './wcag22-checks';

/**
 * WCAG 2.2 checks beyond axe, over every story in one pass each (light theme: none of them depends
 * on colour). Guides/Accessibility conformance lists what each covers and what stays manual.
 *
 * Every check is proved to fire by a fixture story in tests/visual/fixtures/, tagged
 * `check-fixture` and `expect:<check id>`. Fixtures are hidden from the gallery (`!dev`) and from
 * the screenshot and axe suite (`no-visual`), and each must produce the violation it expects.
 *
 * Set WCAG22_TIMINGS=<file> to append each story's per-check time (ms) as a JSON line.
 */

/** Tab stops per direction before giving up on wrap-around. The longest example has about 30. */
const MAX_TAB_STOPS = 200;

/**
 * Tab forward through every focus stop until focus wraps or leaves the page, then Shift+Tab back
 * the same way: forward exposes bars stuck to the block end (action bars), backward bars stuck to
 * the block start (a table's header row).
 */
const focusNotObscured = async (page: Page) => {
  const violations = new Set<string>();
  for (const key of ['Tab', 'Shift+Tab']) {
    const seen = new Set<string>();
    for (let stop = 0; stop < MAX_TAB_STOPS; stop += 1) {
      await page.keyboard.press(key);
      const focus = await page.evaluate(focusObscuredViolation);
      if (focus.key === null ? stop > 0 : seen.has(focus.key)) break;
      if (focus.key !== null) seen.add(focus.key);
      for (const v of focus.violations) violations.add(`${v} [${key}]`);
    }
  }
  return [...violations];
};

const RUNNERS: Record<CheckId, (page: Page, story: IndexEntry) => Promise<string[]>> = {
  'target-size': (page) => page.evaluate(targetSizeViolations),
  'accessible-authentication': (page) => page.evaluate(accessibleAuthenticationViolations),
  // Last: tabbing opens tooltips and scrolls.
  'focus-not-obscured': focusNotObscured,
};

const fixtures = Object.values(index.entries).filter((e) => e.type === 'story' && e.tags?.includes('check-fixture'));
const expectedCheck = (fixture: IndexEntry) => fixture.tags?.find((t) => t.startsWith('expect:'))?.slice('expect:'.length);
const TIMINGS = process.env.WCAG22_TIMINGS ? resolve(process.env.WCAG22_TIMINGS) : undefined;

const runChecks = async (page: Page, story: IndexEntry) => {
  const timings: Partial<Record<CheckId, number>> = {};
  const results = {} as Record<CheckId, string[]>;
  for (const id of CHECKS) {
    const started = performance.now();
    results[id] = await RUNNERS[id](page, story);
    timings[id] = Math.round(performance.now() - started);
  }
  if (TIMINGS) {
    mkdirSync(dirname(TIMINGS), { recursive: true });
    appendFileSync(TIMINGS, `${JSON.stringify({ id: story.id, ...timings })}\n`);
  }
  return results;
};

test.describe('WCAG 2.2 checks', () => {
  for (const story of stories) {
    test(`${story.title} / ${story.name} @wcag22`, async ({ page }) => {
      await openStory(page, story.id, 'light');
      const results = await runChecks(page, story);
      const summary = Object.entries(results).flatMap(([id, found]) => found.map((v) => `${id}: ${v}`));
      expect(summary, `WCAG 2.2 violations in ${story.id}`).toEqual([]);
    });
  }
});

test.describe('WCAG 2.2 check fixtures', () => {
  test('every check has a fixture, and every fixture expects a known check @wcag22', () => {
    const expected = fixtures.map(expectedCheck);
    for (const [i, id] of expected.entries()) expect(CHECKS as readonly (string | undefined)[], `${fixtures[i]?.id ?? ''} expects an unknown check`).toContain(id);
    for (const id of CHECKS) expect(expected, `no fixture proves "${id}" fires`).toContain(id);
  });

  for (const fixture of fixtures) {
    test(`${fixture.title} / ${fixture.name} fires ${expectedCheck(fixture) ?? '?'} @wcag22`, async ({ page }) => {
      await openStory(page, fixture.id, 'light');
      const results = await runChecks(page, fixture);
      const id = expectedCheck(fixture) as CheckId;
      expect(results[id], `${fixture.id} should fail ${id}`).not.toEqual([]);
    });
  }
});
