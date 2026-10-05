import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Page } from '@playwright/test';
import type { IndexEntry } from './storybook';
import {
  accessibleAuthenticationViolations,
  CHECKS,
  consistentHelpViolations,
  focusObscuredViolation,
  targetSizeViolations,
  type CheckId,
} from './wcag22-checks';

/**
 * Running the WCAG 2.2 checks beyond axe on an open story: shared by stories.spec.ts (every story,
 * in the same page load as its light-theme screenshot and axe run) and wcag22.spec.ts (the fixtures
 * that prove each check fires). Not a spec file, so it registers no tests.
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
  // App pages: the golden examples (and the fixtures). Layout stories show the shell's slots one by one.
  'consistent-help': async (page, story) =>
    story.title.startsWith('Examples/') || story.tags?.includes('check-fixture') ? page.evaluate(consistentHelpViolations) : [],
  // Last: tabbing opens tooltips and scrolls.
  'focus-not-obscured': focusNotObscured,
};

const TIMINGS = process.env.WCAG22_TIMINGS ? resolve(process.env.WCAG22_TIMINGS) : undefined;

export const runChecks = async (page: Page, story: IndexEntry) => {
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
