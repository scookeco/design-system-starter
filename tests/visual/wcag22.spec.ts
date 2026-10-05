import { expect, test } from '@playwright/test';
import { index, openStory, selected, type IndexEntry } from './storybook';
import { CHECKS, type CheckId } from './wcag22-checks';
import { runChecks } from './wcag22-run';

/**
 * WCAG 2.2 checks beyond axe. Every story gets them in stories.spec.ts, in the same page load as
 * its light-theme screenshot and axe run (none of them depends on colour); Guides/Accessibility
 * conformance lists what each covers and what stays manual.
 *
 * This file proves each check fires: a fixture story in tests/visual/fixtures/, tagged
 * `check-fixture` and `expect:<check id>`, must produce the violation it expects. Fixtures are
 * hidden from the gallery (`!dev`) and from the screenshot and axe suite (`no-visual`).
 */

const fixtures = Object.values(index.entries).filter((e) => e.type === 'story' && e.tags?.includes('check-fixture'));
const expectedCheck = (fixture: IndexEntry) => fixture.tags?.find((t) => t.startsWith('expect:'))?.slice('expect:'.length);

test.describe('WCAG 2.2 check fixtures', () => {
  test('every check has a fixture, and every fixture expects a known check @wcag22', () => {
    const expected = fixtures.map(expectedCheck);
    for (const [i, id] of expected.entries()) expect(CHECKS as readonly (string | undefined)[], `${fixtures[i]?.id ?? ''} expects an unknown check`).toContain(id);
    for (const id of CHECKS) expect(expected, `no fixture proves "${id}" fires`).toContain(id);
  });

  for (const fixture of fixtures.filter(selected)) {
    test(`${fixture.title} / ${fixture.name} fires ${expectedCheck(fixture) ?? '?'} @wcag22`, async ({ page }) => {
      await openStory(page, fixture.id, 'light');
      const results = await runChecks(page, fixture);
      const id = expectedCheck(fixture) as CheckId;
      expect(results[id], `${fixture.id} should fail ${id}`).not.toEqual([]);
    });
  }
});
