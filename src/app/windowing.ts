/**
 * Windowing: which rows of a long list to render. Only the rows in the scroll container's view,
 * plus a few either side (`overscan`), are in the DOM; spacers stand in for the rest, so the
 * scrollbar is as long as the whole list. A small in-repo hook on purpose: the list page needs
 * fixed-order rows in one scroll container, which is a few dozen lines, not a dependency.
 *
 *   rows      measured, not assumed: the average height of every row rendered so far (rows can wrap)
 *   pinned    a row that holds focus stays rendered while it's scrolled away, so focus is never
 *             dropped to <body> by an unmount
 *   keyboard  `scrollToIndex` brings a row into the window before it's focused (arrow keys, Home,
 *             End), since a row that isn't rendered can't take focus
 *
 * The scroll container is found from a rendered row (`attach`), so the component that scrolls
 * (a system Table with a capped height) needs no extra prop to expose it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface WindowOptions {
  /** How many rows the whole list has. */
  count: number;
  /** Rows rendered beyond each edge of the view, so a fast scroll or a Tab never lands on a gap. */
  overscan?: number;
  /** The row height to assume until one is measured. */
  estimateRowHeight?: number;
  /** A row to keep rendered wherever it is (the one holding focus). */
  pinned?: number | undefined;
  /** Given a rendered row, its scroll container. The nearest scrollable ancestor by default. */
  findScroller?: (row: HTMLElement) => HTMLElement | null;
}

/** What to render, in order: runs of rows, and gaps that spacers fill. */
export type WindowSlot = { kind: 'row'; index: number } | { kind: 'gap'; rows: number; key: string };

export interface RowWindow {
  /** The rows and spacers to render, top to bottom. */
  slots: readonly WindowSlot[];
  /** First and last rendered row in the run around the view (the pages to fetch). */
  first: number;
  last: number;
  /** The measured (or estimated) height of one row, for the spacers. */
  rowHeight: number;
  /** Put on the rendered rows: finds the scroll container and measures row heights. */
  attach: (row: HTMLElement | null) => void;
  /** Scroll so row `index` is in the window (it renders on the next frame). */
  scrollToIndex: (index: number) => void;
}

/** Without a layout (a test environment), assume a view this tall. */
const FALLBACK_VIEW = 600;

const nearestScroller = (row: HTMLElement): HTMLElement | null => {
  for (let el = row.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
  }
  return null;
};

export function useWindowedRows({ count, overscan = 8, estimateRowHeight = 44, pinned, findScroller = nearestScroller }: WindowOptions): RowWindow {
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [view, setView] = useState({ top: 0, height: 0 });
  const [rowHeight, setRowHeight] = useState(estimateRowHeight);

  useEffect(() => {
    if (!scroller) return;
    const update = () => setView((current) => (current.top === scroller.scrollTop && current.height === scroller.clientHeight ? current : { top: scroller.scrollTop, height: scroller.clientHeight }));
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    resize?.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', update);
      resize?.disconnect();
    };
  }, [scroller]);

  // Every row measured so far, by its index: the average only settles as more are seen, so it can't
  // swing back and forth between two windows (which would re-render forever).
  const measured = useRef({ heights: new Map<string, number>(), sum: 0 });

  const attach = useCallback(
    (row: HTMLElement | null) => {
      if (!row) return;
      const found = findScroller(row);
      if (found) setScroller((current) => current ?? found);
      const index = row.getAttribute('aria-rowindex');
      const height = row.getBoundingClientRect().height;
      if (index === null || height <= 0) return;
      const sample = measured.current;
      sample.sum += height - (sample.heights.get(index) ?? 0);
      sample.heights.set(index, height);
      const average = sample.sum / sample.heights.size;
      setRowHeight((current) => (Math.abs(current - average) >= 1 ? average : current));
    },
    [findScroller],
  );

  const height = view.height || FALLBACK_VIEW;
  const last = count === 0 ? -1 : Math.min(count - 1, Math.ceil((view.top + height) / rowHeight) + overscan);
  const first = count === 0 ? 0 : Math.max(0, Math.min(last, Math.floor(view.top / rowHeight) - overscan));

  const slots: WindowSlot[] = [];
  const rows = pinned !== undefined && pinned < count && (pinned < first || pinned > last) ? [pinned] : [];
  const runs = [...rows.filter((p) => p < first), ...(last >= first ? [[first, last] as const] : []), ...rows.filter((p) => p > last)];
  let next = 0;
  for (const run of runs) {
    const [start, end] = typeof run === 'number' ? [run, run] : run;
    if (start > next) slots.push({ kind: 'gap', rows: start - next, key: `gap-${String(next)}` });
    for (let index = start; index <= end; index += 1) slots.push({ kind: 'row', index });
    next = end + 1;
  }
  if (count > next) slots.push({ kind: 'gap', rows: count - next, key: `gap-${String(next)}` });

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!scroller) return;
      const top = index * rowHeight;
      const visible = scroller.clientHeight || FALLBACK_VIEW;
      // Only when it's out of view: centred, so the rows around it come with it.
      if (top < scroller.scrollTop || top + rowHeight > scroller.scrollTop + visible) scroller.scrollTop = Math.max(0, top - visible / 2);
      setView({ top: scroller.scrollTop || Math.max(0, top - visible / 2), height: scroller.clientHeight });
    },
    [scroller, rowHeight],
  );

  return { slots, first, last, rowHeight, attach, scrollToIndex };
}
