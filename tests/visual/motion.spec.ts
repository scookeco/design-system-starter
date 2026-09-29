import { expect, test, type Page } from '@playwright/test';
import { VIEW_TRANSITIONS_ATTRIBUTE } from '../../src/app/viewTransition';
import { openStory } from './storybook';

/**
 * Motion that screenshots can't see. The visual suite runs with reduced motion, where every
 * duration token is 0ms, and with view transitions off, so it only ever captures end states. These
 * specs turn motion back on and check what moves, how long for, and that the switches that make
 * the other specs deterministic really do stop it. No screenshots here.
 */

interface SeenTransition {
  property: string;
  duration: number;
}

/**
 * From before the overlay opens: record the CSS transitions running on each element matching
 * `selector` at the moment it is inserted. getAnimations() flushes style, so the @starting-style
 * transition is there to be seen however quickly the check runs.
 */
const watchEntry = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const seen: SeenTransition[] = [];
    const root = document.documentElement;
    root.dataset.entryTransitions = '[]';
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          for (const el of [node, ...node.querySelectorAll(sel)].filter((e) => e.matches(sel))) {
            for (const animation of el.getAnimations()) {
              if (animation instanceof CSSTransition) seen.push({ property: animation.transitionProperty, duration: Number(animation.effect?.getTiming().duration) });
            }
          }
        }
      }
      root.dataset.entryTransitions = JSON.stringify(seen);
    }).observe(document.body, { childList: true, subtree: true });
  }, selector);

const seenTransitions = async (page: Page) => JSON.parse((await page.locator('html').getAttribute('data-entry-transitions')) ?? '[]') as SeenTransition[];

/** A duration token's value in ms, as the page resolves it (so reduced motion shows as 0). */
const tokenMs = (page: Page, name: string) =>
  page.evaluate((n) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
  }, name);

const OVERLAYS = [
  { name: 'Popover', story: 'components-popover--closed', selector: '.popover', token: '--motion-base', properties: ['opacity'], open: (page: Page) => page.getByRole('button').first().click() },
  { name: 'Tooltip', story: 'components-tooltip--closed', selector: '.tooltip', token: '--motion-fast', properties: ['opacity'], open: (page: Page) => page.keyboard.press('Tab') },
  { name: 'HoverCard', story: 'components-hovercard--closed', selector: '.hover-card', token: '--motion-base', properties: ['opacity'], open: (page: Page) => page.getByRole('link').first().hover() },
  { name: 'Menu', story: 'components-menu--closed', selector: '.menu', token: '--motion-base', properties: ['opacity'], open: (page: Page) => page.getByRole('button').first().click() },
  { name: 'Dialog', story: 'components-dialog--closed', selector: '.dialog__overlay', token: '--motion-slow', properties: ['opacity'], open: (page: Page) => page.getByRole('button').first().click() },
  { name: 'Drawer', story: 'components-drawer--closed', selector: '.drawer', token: '--motion-slow', properties: ['opacity', 'translate'], open: (page: Page) => page.getByRole('button').first().click() },
  { name: 'Toast', story: 'components-toast--imperative', selector: '.toast', token: '--motion-slow', properties: ['opacity', 'translate'], open: (page: Page) => page.getByRole('button').first().click() },
] as const;

test.describe('overlay entry transitions', () => {
  test.describe('with motion welcome', () => {
    test.use({ reducedMotion: 'no-preference' });

    for (const overlay of OVERLAYS) {
      test(`${overlay.name} fades in over ${overlay.token}`, async ({ page }) => {
        await openStory(page, overlay.story, 'light');
        await watchEntry(page, overlay.selector);
        await overlay.open(page);
        await expect(page.locator(overlay.selector).first()).toBeVisible();
        const duration = await tokenMs(page, overlay.token);
        expect(duration).toBeGreaterThan(0);
        await expect.poll(async () => (await seenTransitions(page)).map((t) => t.property).sort()).toEqual([...overlay.properties].sort());
        for (const transition of await seenTransitions(page)) expect(transition.duration).toBe(duration);
      });
    }
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    for (const overlay of OVERLAYS) {
      test(`${overlay.name} appears at once`, async ({ page }) => {
        await openStory(page, overlay.story, 'light');
        await watchEntry(page, overlay.selector);
        await overlay.open(page);
        await expect(page.locator(overlay.selector).first()).toBeVisible();
        expect(await tokenMs(page, overlay.token)).toBe(0);
        expect(await seenTransitions(page)).toEqual([]);
      });
    }
  });
});

/** Count calls to document.startViewTransition from now on, still letting them run. */
const countViewTransitions = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.viewTransitionCalls = '0';
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
      root.dataset.viewTransitionCalls = String(Number(root.dataset.viewTransitionCalls) + 1);
      return start(callback);
    }) as typeof document.startViewTransition;
  });

const viewTransitionCalls = async (page: Page) => Number(await page.locator('html').getAttribute('data-view-transition-calls'));

/** The example app's list, then a record from it: a route change. */
const openARecord = async (page: Page) => {
  await openStory(page, 'examples-app--records', 'light');
  await countViewTransitions(page);
  const link = page.locator('main table a').first();
  const name = (await link.textContent()) ?? '';
  await link.click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
};

test.describe('view transitions in the example app', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the harness flag swaps the view at once', async ({ page }) => {
    await openARecord(page);
    await expect(page.locator('html')).toHaveAttribute(VIEW_TRANSITIONS_ATTRIBUTE, 'off');
    expect(await viewTransitionCalls(page)).toBe(0);
  });

  test('without the flag, a route change cross-fades over motion.view', async ({ page }) => {
    await openStory(page, 'examples-app--records', 'light');
    await page.evaluate((attribute) => document.documentElement.removeAttribute(attribute), VIEW_TRANSITIONS_ATTRIBUTE);
    await countViewTransitions(page);
    const link = page.locator('main table a').first();
    const name = (await link.textContent()) ?? '';
    await link.click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    expect(await viewTransitionCalls(page)).toBe(1);
    expect(await tokenMs(page, '--motion-view')).toBeGreaterThan(0);
  });

  test('without the flag, switching a list from table to board cross-fades', async ({ page }) => {
    await openStory(page, 'examples-list-page--default', 'light');
    await page.evaluate((attribute) => document.documentElement.removeAttribute(attribute), VIEW_TRANSITIONS_ATTRIBUTE);
    await countViewTransitions(page);
    await page.getByRole('radio', { name: 'Board' }).click();
    await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
    await expect(page.locator('main table')).toHaveCount(0);
    expect(await viewTransitionCalls(page)).toBe(1);
  });

  test('under reduced motion, nothing cross-fades even without the flag', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, 'examples-list-page--default', 'light');
    await page.evaluate((attribute) => document.documentElement.removeAttribute(attribute), VIEW_TRANSITIONS_ATTRIBUTE);
    await countViewTransitions(page);
    await page.getByRole('radio', { name: 'Board' }).click();
    await expect(page.getByRole('radio', { name: 'Board' })).toBeChecked();
    expect(await viewTransitionCalls(page)).toBe(0);
  });
});
