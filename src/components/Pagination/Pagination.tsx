import { cx, type EscapeHatch } from '../../internal/closed-api';
import { useFormat } from '../../format/LocaleProvider';
import { Icon } from '../Icon/Icon';
import './Pagination.css';

export interface PaginationProps extends EscapeHatch {
  /** Current page, from 1. */
  page: number;
  pageSize: number;
  /** Total items across every page. */
  total: number;
  onPageChange: (page: number) => void;
  /** Accessible name of the navigation landmark. */
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** Accessible name of a page button, from its number ("Page 3"). */
  pageLabel?: (page: number) => string;
  /** Formats counts in the summary. Defaults to the LocaleProvider's number format ("1,284", "1.284"). */
  formatNumber?: (n: number) => string;
  /**
   * Make the summary ("1–25 of 1,284") a polite live region, so a new page or a new total after
   * filtering is announced. Use it when nothing else on the page announces the count.
   */
  announce?: boolean;
}

type PageSlot = number | 'gap-start' | 'gap-end';

/** First, last, and the current page with one neighbour each side; gaps elsewhere. */
const slots = (page: number, pages: number): PageSlot[] => {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: PageSlot[] = [];
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && p - previous > 1) result.push(p < page ? 'gap-start' : 'gap-end');
    result.push(p);
  });
  return result;
};

/**
 * Moves through a long, server-paged list: a summary of what is shown, Previous and Next, and page
 * numbers around the current one. A labelled nav landmark; the current page has aria-current="page".
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  label = 'Pagination',
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pageLabel = (p) => `Page ${String(p)}`,
  formatNumber,
  announce = false,
  UNSAFE_className,
  UNSAFE_style,
}: PaginationProps) {
  const format = useFormat();
  const formatCount = formatNumber ?? ((n: number) => format.number(n));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), pages);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, total);
  // At either end Previous/Next stay focusable but inert (aria-disabled), so focus is never dropped.
  const go = (target: number) => {
    if (target >= 1 && target <= pages && target !== current) onPageChange(target);
  };

  return (
    <nav aria-label={label} className={cx('pagination', UNSAFE_className)} style={UNSAFE_style}>
      <p className="pagination__summary" role={announce ? 'status' : undefined}>
        {`${formatCount(first)}–${formatCount(last)} of ${formatCount(total)}`}
      </p>
      <ul role="list" className="pagination__list">
        <li>
          <button type="button" className="pagination__step" aria-disabled={current === 1 || undefined} onClick={() => go(current - 1)}>
            <Icon name="chevron-left" />
            {previousLabel}
          </button>
        </li>
        {slots(current, pages).map((slot) =>
          typeof slot === 'number' ? (
            <li key={slot}>
              <button
                type="button"
                className="pagination__page"
                aria-label={pageLabel(slot)}
                aria-current={slot === current ? 'page' : undefined}
                onClick={() => go(slot)}
              >
                {formatCount(slot)}
              </button>
            </li>
          ) : (
            <li key={slot} className="pagination__gap" aria-hidden="true">
              …
            </li>
          ),
        )}
        <li>
          <button type="button" className="pagination__step" aria-disabled={current === pages || undefined} onClick={() => go(current + 1)}>
            {nextLabel}
            <Icon name="chevron-right" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
