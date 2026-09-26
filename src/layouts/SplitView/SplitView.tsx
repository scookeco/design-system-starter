import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../../components/Button/Button';
import './SplitView.css';

/** The list pane's share of the width, in percent: the most and least it can take. */
const MIN_SIZE = 25;
const MAX_SIZE = 65;
/** A click on the divider steps through these (the single-pointer alternative to dragging). */
const PRESETS = [30, 40, 55] as const;
const STEP = 5;

const clamp = (n: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n)));

export interface SplitViewProps extends EscapeHatch {
  /** The list: rows to move through. */
  list: ReactNode;
  /** The selected item, beside the list. */
  detail: ReactNode;
  /** Accessible names of the two regions ("Conversations", "Conversation"). Required. */
  listLabel: string;
  detailLabel: string;
  /**
   * On a narrow container only one pane fits: which one shows. Wide containers always show both.
   * Show the detail once something is opened, the list again on Back.
   */
  show?: 'list' | 'detail';
  /** Narrow only: the Back button above the detail. Omit onBack to leave it out. */
  onBack?: () => void;
  backLabel?: string;
  /** The list pane's width in percent (25–65). Uncontrolled default 40. */
  listSize?: number;
  defaultListSize?: number;
  onListSizeChange?: (size: number) => void;
  /** Accessible name of the divider. */
  resizeLabel?: string;
}

/**
 * A list and the selected item side by side (an inbox, a queue, a file browser), each pane
 * scrolling on its own. The divider resizes the list: drag it, focus it and use ← → (Home and
 * End for the limits), or click it to step through preset widths. Below the size.breakpoint.sm
 * container width it collapses to one pane, the one `show` names, with a Back button above the
 * detail. It lays out; the page owns selection and what the panes hold.
 */
export function SplitView({
  list,
  detail,
  listLabel,
  detailLabel,
  show = 'list',
  onBack,
  backLabel = 'Back',
  listSize,
  defaultListSize = 40,
  onListSizeChange,
  resizeLabel = 'Resize list',
  UNSAFE_className,
  UNSAFE_style,
}: SplitViewProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [ownSize, setOwnSize] = useState(clamp(defaultListSize));
  const size = clamp(listSize ?? ownSize);
  const drag = useRef<{ moved: boolean } | null>(null);

  const setSize = (next: number) => {
    const clamped = clamp(next);
    if (listSize === undefined) setOwnSize(clamped);
    onListSizeChange?.(clamped);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowLeft: size - STEP, ArrowRight: size + STEP, Home: MIN_SIZE, End: MAX_SIZE };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    // In a right-to-left page the list is on the right: the arrows follow what you see.
    const rtl = root.current ? getComputedStyle(root.current).direction === 'rtl' : false;
    setSize(rtl && (event.key === 'ArrowLeft' || event.key === 'ArrowRight') ? size - (next - size) : next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !root.current) return;
    const box = root.current.getBoundingClientRect();
    const rtl = getComputedStyle(root.current).direction === 'rtl';
    const offset = rtl ? box.right - event.clientX : event.clientX - box.left;
    drag.current.moved = true;
    setSize((offset / box.width) * 100);
  };
  const onPointerUp = () => {
    // A click without a drag steps to the next preset width.
    if (drag.current && !drag.current.moved) setSize(PRESETS.find((p) => p > size) ?? PRESETS[0]);
    drag.current = null;
  };

  return (
    <div
      ref={root}
      className={cx('split-view', UNSAFE_className)}
      style={{ ['--split-view-list-size' as string]: `${String(size)}%`, ...UNSAFE_style }}
      data-show={show}
    >
      <section className="split-view__list" id={`${id}-list`} aria-label={listLabel}>
        {list}
      </section>
      <div
        className="split-view__divider"
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeLabel}
        aria-controls={`${id}-list`}
        aria-valuenow={size}
        aria-valuemin={MIN_SIZE}
        aria-valuemax={MAX_SIZE}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        data-drag-alternative="click the divider to step through preset widths, or focus it and use the arrow keys"
      />
      <section className="split-view__detail" aria-label={detailLabel}>
        {onBack ? (
          <div className="split-view__back">
            <Button variant="ghost" size="sm" icon="chevron-left" onClick={onBack}>
              {backLabel}
            </Button>
          </div>
        ) : null}
        {detail}
      </section>
    </div>
  );
}
