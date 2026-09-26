import type { MouseEvent, ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Link } from '../Link/Link';
import './Citation.css';

/** The DOM id of source `number` in the SourcesList with this `id`. */
const sourceId = (listId: string, number: number) => `${listId}-${String(number)}`;

export interface CitationProps extends EscapeHatch {
  /** The source's number, as it appears in the SourcesList (1-based). */
  number: number;
  /** The `id` of the SourcesList this cites. */
  sources: string;
  /** The source's title, for the accessible name ("Source 1: Renews on"). Required: a bare number means nothing when heard. */
  title: string;
  /** Called when the citation is followed, with its number: highlight the source (and its passage) there. */
  onActivate?: (number: number) => void;
}

/**
 * A numbered inline citation, [1], that follows through to its source in a SourcesList: activating
 * it moves focus to that source. It is a real link, never an inert label.
 */
export function Citation({ number, sources, title, onActivate, UNSAFE_className, UNSAFE_style }: CitationProps) {
  const target = sourceId(sources, number);
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(target)?.focus();
    onActivate?.(number);
  };
  return (
    <sup className={cx('citation', UNSAFE_className)} style={UNSAFE_style}>
      <a className="citation__link" href={`#${target}`} aria-label={`Source ${String(number)}: ${title}`} onClick={follow}>
        {`[${String(number)}]`}
      </a>
    </sup>
  );
}

export interface Source {
  /** Title of the source: a field ("Renews on"), a document, an activity entry, a page. */
  title: string;
  /** Where it comes from: a domain ("example.com") or a kind ("Record field", "Activity"). */
  origin: string;
  /** A short excerpt or value, so the claim can be checked without leaving. */
  excerpt?: string;
  /** Where the source lives. Opens it (a record section, a document); routed through LinkProvider. */
  href?: string;
  /** Link text when there is an href ("Open in record"). */
  hrefLabel?: string;
}

export interface SourcesListProps extends EscapeHatch {
  /** Id that Citations point at (their `sources` prop). Use a useId() value: it must be unique on the page. */
  id: string;
  sources: readonly Source[];
  /** Heading above the list. */
  label?: string;
  /** The source last followed from a Citation (1-based): marked as current. */
  active?: number | undefined;
  /** Rendered after the heading, before the list (a provenance line: "Based on 1 record and 3 activity entries"). */
  summary?: ReactNode;
}

/**
 * The numbered sources behind an answer, one card each (title, origin, excerpt, a link to the
 * source). Citations in the text point here; the one followed last is marked with aria-current.
 */
export function SourcesList({ id, sources, label = 'Sources', active, summary, UNSAFE_className, UNSAFE_style }: SourcesListProps) {
  const headingId = `${id}-label`;
  return (
    <section className={cx('sources-list', UNSAFE_className)} style={UNSAFE_style} aria-labelledby={headingId}>
      <p className="sources-list__label" id={headingId}>
        {label}
      </p>
      {summary}
      <ol className="sources-list__items">
        {sources.map((source, index) => (
          <li
            key={sourceId(id, index + 1)}
            id={sourceId(id, index + 1)}
            className="sources-list__item"
            tabIndex={-1}
            aria-current={active === index + 1 ? 'true' : undefined}
          >
            <span className="sources-list__number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="sources-list__body">
              <span className="sources-list__title">{source.title}</span>
              <span className="sources-list__origin">{source.origin}</span>
              {source.excerpt ? <span className="sources-list__excerpt">{source.excerpt}</span> : null}
              {source.href ? <Link href={source.href}>{source.hrefLabel ?? `Open ${source.title}`}</Link> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
