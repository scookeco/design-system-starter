import type { ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Timeline.css';

/** One thing that happened: who did what to which, and when. */
export interface TimelineEvent {
  id: string;
  /** Who did it ("Priya Shah", "System"). */
  actor: string;
  /** What they did, lower case ("changed the status of", "commented on"). */
  verb: string;
  /** What they did it to. A Link when it has a page of its own. */
  target?: ReactNode;
  /** When, formatted for people ("2 hours ago", "12 Mar 2026, 14:05"). The caller formats it. */
  time: string;
  /** The same moment as an ISO 8601 date-time, for the <time> element. */
  dateTime: string;
  /** A quoted comment or the before and after of a change. */
  detail?: string;
}

export interface TimelineProps extends EscapeHatch {
  /** Accessible name of the list ("Activity on INV-2041"). Required. */
  label: string;
  /** Events in the order to show them, newest first by convention. */
  events: readonly TimelineEvent[];
  /** Shown when there are no events. */
  emptyText?: string;
}

/**
 * A dated list of events (actor, verb, target, time): a record's activity, an audit trail, a feed.
 * An ordered list of <time>-stamped sentences, so it reads the same with or without the rail.
 */
export function Timeline({ label, events, emptyText = 'No activity yet.', UNSAFE_className, UNSAFE_style }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className={cx('timeline-empty', UNSAFE_className)} style={UNSAFE_style}>
        {emptyText}
      </p>
    );
  }
  return (
    <ol className={cx('timeline', UNSAFE_className)} style={UNSAFE_style} aria-label={label}>
      {events.map((event) => (
        <li key={event.id} className="timeline__item">
          <span className="timeline__marker" aria-hidden="true" />
          <div className="timeline__body">
            <p className="timeline__sentence">
              <span className="timeline__actor">{event.actor}</span> {event.verb}
              {event.target ? <> {event.target}</> : null}
            </p>
            {event.detail ? <p className="timeline__detail">{event.detail}</p> : null}
            <time className="timeline__time" dateTime={event.dateTime}>
              {event.time}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
