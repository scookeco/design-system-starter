/**
 * Same-document view transitions for the example app: a short cross-fade when the route changes or
 * a list switches display (table ↔ board), so the page visibly turns over instead of jumping.
 *
 * Progressive enhancement, in one place. `withViewTransition(update)` runs `update` exactly once,
 * and runs it inside `document.startViewTransition` only when all of these hold:
 *   - the browser has the API (Baseline newly available, 2025-10-14; Guides/Browser support);
 *   - the person hasn't asked for reduced motion (prefers-reduced-motion: reduce);
 *   - nothing turned transitions off: `data-view-transitions="off"` on <html>. The Playwright
 *     harness sets it on every story (tests/visual/storybook.ts), so screenshots and checks always
 *     see the settled end state, never a cross-fade.
 * Otherwise `update` runs directly, with no flushSync, exactly as before.
 *
 * How it looks (duration and easing from motion.view and ease.standard) is the system's, in
 * src/styles/base.css; the app decides only when to use it. Views never depend on it: focus, the
 * URL and what's announced change the same way with or without the transition.
 *
 * A lazy route whose code hasn't loaded yet renders nothing until it has (RouteView's Suspense
 * fallback is null), so its first visit cross-fades to an empty main and the page then appears.
 */
import { flushSync } from 'react-dom';

/** Set on <html> to turn view transitions off: `<html data-view-transitions="off">`. */
export const VIEW_TRANSITIONS_ATTRIBUTE = 'data-view-transitions';

/** Whether an update would run inside a view transition now. */
export function viewTransitionsEnabled(doc: Document | undefined = globalThis.document): boolean {
  if (!doc || typeof doc.startViewTransition !== 'function') return false;
  if (doc.documentElement.getAttribute(VIEW_TRANSITIONS_ATTRIBUTE) === 'off') return false;
  const view = doc.defaultView;
  if (!view || typeof view.matchMedia !== 'function') return false;
  return !view.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Run a UI update (a navigation, a display switch), cross-fading from the old view to the new one
 * where the platform and the person allow it. `update` runs exactly once, synchronously when there
 * is no transition, and inside the transition's callback (flushed, so the new view is in the DOM
 * when the browser captures it) when there is.
 */
export function withViewTransition(update: () => void, doc: Document | undefined = globalThis.document): void {
  if (!doc || !viewTransitionsEnabled(doc)) {
    update();
    return;
  }
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    flushSync(update);
  };
  try {
    // A transition already running is skipped by the browser; its callback still runs. The callback
    // runs a frame later, once the old view is captured, so the URL changes then too.
    const transition = doc.startViewTransition(run);
    // A skipped or interrupted animation isn't an error: the update has run either way.
    const ignore = () => undefined;
    transition.ready.catch(ignore);
    transition.updateCallbackDone.catch(ignore);
    transition.finished.catch(ignore);
  } catch {
    run();
  }
}
