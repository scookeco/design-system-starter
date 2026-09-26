/**
 * Scroll and focus restoration for lists. Opening a row is navigation (push); Back (a pop) returns
 * to the list as it was: scrolled where it was, with focus on the row that was opened, so a
 * keyboard or screen reader user carries on from there instead of from the top of the page.
 *
 * Only on a pop. A fresh visit (a nav link, a pushed tab or page) starts at the top, and a
 * refinement (replace: a filter, a sort) leaves scroll and focus where they are. Remembered per URL
 * (the list's search, filters and page are part of it) for the life of the tab.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { UrlHistory } from './history';
import { useHistory } from './useUrlState';

interface Saved {
  /** The opened row's link, as a selector ('a[href="/records/r-1001"]'). */
  selector: string;
  /** Every ancestor that was scrolled, by depth in the document, and how far. */
  scrolls: { depth: number; top: number }[];
}

const memory = new WeakMap<UrlHistory, Map<string, Saved>>();
const savedFor = (history: UrlHistory) => {
  let saved = memory.get(history);
  if (!saved) {
    saved = new Map();
    memory.set(history, saved);
  }
  return saved;
};

const urlOf = (history: UrlHistory) => {
  const { pathname, search } = history.location();
  return `${pathname}${search}`;
};

const depthOf = (element: Element) => {
  let depth = 0;
  for (let node = element.parentElement; node; node = node.parentElement) depth += 1;
  return depth;
};

const ancestors = function* (element: Element) {
  for (let node = element.parentElement; node; node = node.parentElement) yield node;
};

/**
 * `ready`: the rows are on screen. Call `remember(event.currentTarget)` from a row link's onClick;
 * the list's link to the same place gets focus back when the person returns with Back.
 */
export function useListRestoration(ready: boolean) {
  const history = useHistory();
  const restored = useRef(false);

  const remember = useCallback(
    (link: HTMLAnchorElement) => {
      const scrolls = [...ancestors(link)].filter((node) => node.scrollTop > 0).map((node) => ({ depth: depthOf(node), top: node.scrollTop }));
      savedFor(history).set(urlOf(history), { selector: `a[href="${(link.getAttribute('href') ?? '').replace(/["\\]/g, '\\$&')}"]`, scrolls });
    },
    [history],
  );

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    if (history.action?.() !== 'pop') return;
    const saved = savedFor(history).get(urlOf(history));
    const link = saved ? document.querySelector<HTMLElement>(saved.selector) : null;
    if (!saved || !link) return;
    for (const node of ancestors(link)) {
      const scroll = saved.scrolls.find((s) => s.depth === depthOf(node));
      if (scroll) node.scrollTop = scroll.top;
    }
    link.focus({ preventScroll: true });
  }, [ready, history]);

  return { remember };
}
