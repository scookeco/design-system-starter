import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../Button/Button';
import './ChatThread.css';

export interface ChatThreadProps extends EscapeHatch {
  /** Accessible name of the thread ("Conversation about Master cleaning agreement"). Required. */
  label: string;
  /** The turns, oldest first: Message elements (give each a stable key). */
  children?: ReactNode;
  /** Shown instead of the thread when it has no turns: suggested prompts, not a blank box. */
  empty?: ReactNode;
  /** Label of the button that returns to the newest turn after scrolling up. */
  jumpLabel?: string;
  /**
   * self: the thread scrolls in its own region, filling its container (a panel).
   * page: the thread grows and the page's scroll region (AppShell's main) scrolls; it follows the
   * output there (a full chat page, with the Composer in AppShell's footer).
   */
  scroll?: 'self' | 'page';
}

/** How close to the bottom (in CSS pixels) still counts as "following the output". */
const FOLLOW_SLACK = 32;

/** The nearest ancestor that scrolls on the block axis: where a page-scrolled thread lives. */
const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
};

/**
 * The list of turns in a conversation. It follows new output while the person is at the bottom,
 * stops following when they scroll up (and offers "Jump to latest"). Scrolling itself, it is a
 * named, focusable region, so it scrolls from the keyboard. It is deliberately not a live region:
 * each answer's StreamingText announces sentences, so tokens are never read one by one.
 */
export function ChatThread({ label, children, empty, jumpLabel = 'Jump to latest', scroll = 'self', UNSAFE_className, UNSAFE_style }: ChatThreadProps) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLOListElement>(null);
  const following = useRef(true);
  const [away, setAway] = useState(false);
  const turns = Children.toArray(children).filter(isValidElement);
  const hasTurns = turns.length > 0;

  const container = () => (scroll === 'self' ? scroller.current : scrollParent(root.current));

  const toLatest = () => {
    const el = container();
    if (el) el.scrollTop = el.scrollHeight;
    following.current = true;
    setAway(false);
  };

  // Follow the output: whenever the content grows and the person hasn't scrolled away, stay at the
  // bottom. Scrolling up stops following; scrolling back to the bottom resumes it.
  useEffect(() => {
    const el = scroll === 'self' ? scroller.current : scrollParent(root.current);
    const list = content.current;
    if (!el || !list || typeof ResizeObserver === 'undefined') return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_SLACK;
      following.current = atBottom;
      setAway(!atBottom);
    };
    const observer = new ResizeObserver(() => {
      if (following.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(list);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.scrollTop = el.scrollHeight;
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
  }, [hasTurns, scroll]);

  const body = !hasTurns ? (
    <div className="chat-thread__empty">{empty}</div>
  ) : (
    <ol className="chat-thread__list" ref={content} aria-label={scroll === 'page' ? label : undefined}>
      {turns.map((turn) => (
        <li key={turn.key} className="chat-thread__turn">
          {turn}
        </li>
      ))}
    </ol>
  );

  return (
    <div ref={root} className={cx('chat-thread', UNSAFE_className)} style={UNSAFE_style} data-scroll={scroll}>
      {scroll === 'self' ? (
        // Focusable and named, so keyboard users can scroll it (axe: scrollable-region-focusable).
        <div className="chat-thread__scroller" ref={scroller} role="region" aria-label={label} tabIndex={0}>
          {body}
        </div>
      ) : (
        body
      )}
      {away ? (
        <div className="chat-thread__jump">
          <Button variant="secondary" size="sm" icon="chevron-down" onClick={toLatest}>
            {jumpLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
