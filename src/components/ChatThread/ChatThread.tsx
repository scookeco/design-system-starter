import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../Button/Button';
import './ChatThread.css';

export interface ChatThreadProps extends EscapeHatch {
  /** Accessible name of the scrollable thread ("Conversation about Master cleaning agreement"). Required. */
  label: string;
  /** The turns, oldest first: Message elements (give each a stable key). */
  children?: ReactNode;
  /** Shown instead of the thread when it has no turns: suggested prompts, not a blank box. */
  empty?: ReactNode;
  /** Label of the button that returns to the newest turn after scrolling up. */
  jumpLabel?: string;
}

/** How close to the bottom (in CSS pixels) still counts as "following the output". */
const FOLLOW_SLACK = 32;

/**
 * The scrolling list of turns in a conversation. It follows new output while the person is at the
 * bottom, stops following when they scroll up (and offers "Jump to latest"), and is a named,
 * focusable region so it scrolls from the keyboard. It is deliberately not a live region: the
 * answer's own StreamingText announces sentences, so tokens are never read one by one.
 */
export function ChatThread({ label, children, empty, jumpLabel = 'Jump to latest', UNSAFE_className, UNSAFE_style }: ChatThreadProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLOListElement>(null);
  const following = useRef(true);
  const [away, setAway] = useState(false);
  const turns = Children.toArray(children).filter(isValidElement);
  const hasTurns = turns.length > 0;

  const toLatest = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    following.current = true;
    setAway(false);
  };

  // Follow the output: whenever the content grows and the person hasn't scrolled away, stay at the bottom.
  useEffect(() => {
    const el = scroller.current;
    const list = content.current;
    if (!el || !list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (following.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(list);
    el.scrollTop = el.scrollHeight;
    return () => observer.disconnect();
  }, [hasTurns]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_SLACK;
    following.current = atBottom;
    setAway(!atBottom);
  };

  return (
    <div className={cx('chat-thread', UNSAFE_className)} style={UNSAFE_style}>
      {/* Focusable and named, so keyboard users can scroll it (axe: scrollable-region-focusable). */}
      <div className="chat-thread__scroller" ref={scroller} role="region" aria-label={label} tabIndex={0} onScroll={onScroll}>
        {!hasTurns ? (
          <div className="chat-thread__empty">{empty}</div>
        ) : (
          <ol className="chat-thread__list" ref={content}>
            {turns.map((turn) => (
              <li key={turn.key} className="chat-thread__turn">
                {turn}
              </li>
            ))}
          </ol>
        )}
      </div>
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
