import { Children, createContext, isValidElement, useContext, useLayoutEffect, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { RouterLink } from '../Link/Link';
import './ResultList.css';

/** Marks each item's link, so the list finds its stops without owning their refs. */
const ITEM_LINK = 'data-result-list-link';

/** Where an item sits in the whole set, when the list is one page of it. */
interface Position {
  index: number;
  start: number;
  total: number | undefined;
}
const PositionContext = createContext<Position | null>(null);

/** ↑ ↓ move by one, Home and End jump. Nothing else: Enter is the link's own, characters are the page's. */
const MOVES: Record<string, (links: readonly HTMLElement[], from: number) => HTMLElement | undefined> = {
  ArrowDown: (links, from) => links[Math.min(from + 1, links.length - 1)],
  ArrowUp: (links, from) => links[Math.max(from - 1, 0)],
  Home: (links) => links[0],
  End: (links) => links.at(-1),
};

const isItemLink = (target: EventTarget | null): target is HTMLElement => target instanceof HTMLElement && target.hasAttribute(ITEM_LINK);

export interface ResultListProps extends EscapeHatch {
  /** Accessible name of the list ("Results", "Search results"). Required. */
  label: string;
  /** ResultListItem elements, best match first. */
  children?: ReactNode;
  /** Shown in place of the list when there are no items: an EmptyState that says why and what to do. Required. */
  empty: ReactNode;
  /** The set's size when this list is one page of it: each item then says where it sits (aria-posinset, aria-setsize). */
  total?: number;
  /** Position of the first item in the whole set, 1-based (page 2 of 20 starts at 21). Used with `total`. */
  start?: number;
  /** `compact` tightens the space between items, for long lists people scan. */
  density?: 'default' | 'compact';
}

/**
 * A list of results people move through one at a time: one tab stop, ↑ ↓ between items, Home and
 * End to the first and last, Enter opens the focused item's link. The list remembers the item you
 * left from, so Tab away and back returns there. Characters are never taken: single-key page
 * shortcuts (j, k) and typing reach the page. A native list of links with a roving tabindex, not
 * a listbox: the items navigate, they aren't options to select.
 */
export function ResultList({ label, children, empty, total, start = 1, density = 'default', UNSAFE_className, UNSAFE_style }: ResultListProps) {
  const list = useRef<HTMLOListElement>(null);
  /** The item that holds the tab stop, by identity: a new page or query drops it, and the first item takes over. */
  const current = useRef<HTMLElement | null>(null);

  const links = () => [...(list.current?.querySelectorAll<HTMLElement>(`[${ITEM_LINK}]`) ?? [])];
  const rove = (to?: HTMLElement) => {
    const all = links();
    const stop = to && all.includes(to) ? to : current.current && all.includes(current.current) ? current.current : all[0];
    current.current = stop ?? null;
    for (const link of all) link.tabIndex = link === stop ? 0 : -1;
  };

  // After every render: items come and go (a new page, a live update), and exactly one keeps the stop.
  useLayoutEffect(() => rove());

  const items = Children.toArray(children).filter(isValidElement);
  if (items.length === 0) return <>{empty}</>;

  // Focus from anywhere (a click, j and k, a restored position) moves the stop with it.
  const onFocus = (event: FocusEvent<HTMLOListElement>) => {
    if (isItemLink(event.target)) rove(event.target);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const move = MOVES[event.key];
    if (!move || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) return;
    if (!isItemLink(event.target)) return;
    event.preventDefault();
    const all = links();
    move(all, all.indexOf(event.target))?.focus();
  };

  return (
    // role="list" keeps list semantics in Safari, which drops them from a list without markers.
    <ol
      ref={list}
      role="list"
      className={cx('result-list', UNSAFE_className)}
      style={UNSAFE_style}
      aria-label={label}
      data-density={density}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      {items.map((item, index) => (
        <PositionContext key={item.key ?? index} value={{ index, start, total }}>
          {item}
        </PositionContext>
      ))}
    </ol>
  );
}

export interface ResultListItemProps {
  /** Where the item goes. Routed through the app's LinkProvider. */
  href: string;
  /** The item's name, and the link's accessible name. Mark matched text with <strong>. */
  children: ReactNode;
  /** A second line: the type and what matched (owner, domain, email). */
  description?: ReactNode;
  /** Beside the name: a status Badge. Not interactive: the item has one control, its link. */
  meta?: ReactNode;
  /** The link's id, for focusing it from a page shortcut. */
  id?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** One item in a ResultList: a link to it, with an optional badge beside it and a second line below. */
export function ResultListItem({ href, children, description, meta, id, onClick }: ResultListItemProps) {
  const position = useContext(PositionContext);
  const where = position && position.total !== undefined ? { 'aria-posinset': position.start + position.index, 'aria-setsize': position.total } : {};
  return (
    <li className="result-list__item" {...where}>
      <div className="result-list__heading">
        <RouterLink className="result-list__link" href={href} id={id} onClick={onClick} data-result-list-link="">
          {/* One flex item, so the spaces around matched <strong> text survive. */}
          <span>{children}</span>
        </RouterLink>
        {meta ? <span className="result-list__meta">{meta}</span> : null}
      </div>
      {description ? <div className="result-list__description">{description}</div> : null}
    </li>
  );
}
