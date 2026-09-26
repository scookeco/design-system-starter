import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import { ariaKeyShortcuts, Kbd, type KeyPlatform } from '../Kbd/Kbd';
import { Spinner } from '../Spinner/Spinner';
import './CommandPalette.css';

export interface CommandItem {
  /** Unique across the palette ("route:/records", "record:r-1002"). */
  id: string;
  /** What it is or does, verb first for actions ("New record"). Matched against the query. */
  label: string;
  /** A second line: where it lives, its type, its owner. Matched too. */
  description?: string;
  icon?: IconName;
  /** Extra words that should find it ("create", "add" for New record). */
  keywords?: readonly string[];
  /** Its keyboard shortcut, shown at the row's end (register the keys with useShortcut). */
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandGroup {
  id: string;
  /** Group heading: "Jump to", "Records", "Actions". */
  label: string;
  items: readonly CommandItem[];
  /**
   * `local` (default): the palette filters and ranks the items against the query.
   * `none`: the items already match (a server search): shown as given.
   */
  filter?: 'local' | 'none';
}

export interface CommandPaletteProps extends EscapeHatch {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Groups in order. A group with no matching items is left out. */
  groups: readonly CommandGroup[];
  /** Controlled query: pass it (and onQueryChange) when a group searches the server. */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Accessible name of the dialog and the input. */
  label?: string;
  placeholder?: string;
  /** A group is still searching: shows a spinner in the input and says so in the count. */
  loading?: boolean;
  /** Shown when nothing matches. */
  emptyMessage?: string;
  /** Announced as the results change: `(count) => '12 results'`. */
  countMessage?: (count: number) => string;
  /** The most items a local group shows for a query (all of them with an empty query). */
  maxPerGroup?: number;
  /** Override the detected platform for key hints (gallery and tests). */
  platform?: KeyPlatform;
}

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * How well a query matches some text, forgivingly: 4 the text starts with it, 3 a word does,
 * 2 it's inside, 1 its letters appear in order from the start of a word ("nwt" finds "Northwind
 * Traders", "new" doesn't find "Adventure Works"), 0 no match.
 */
export const matchScore = (query: string, text: string): number => {
  const q = normalise(query.trim());
  if (!q) return 1;
  const t = normalise(text);
  if (t.startsWith(q)) return 4;
  const words = t.split(/[\s/›·,-]+/);
  if (words.some((word) => word.startsWith(q))) return 3;
  if (t.includes(q)) return 2;
  const letters = q.replace(/\s+/g, '');
  // Letters in order, starting at a word that begins with the first one.
  const starts = [...t.matchAll(/(?:^|[\s/›·,-])(\S)/g)].filter((m) => m[1] === letters[0]).map((m) => (m.index ?? 0) + m[0].length);
  return starts.some((from) => {
    let at = from;
    for (const char of letters.slice(1)) {
      at = t.indexOf(char, at) + 1;
      if (at === 0) return false;
    }
    return true;
  })
    ? 1
    : 0;
};

const scoreItem = (query: string, item: CommandItem) =>
  Math.max(matchScore(query, item.label), ...(item.keywords ?? []).map((k) => matchScore(query, k) - 0.5), item.description ? matchScore(query, item.description) - 1 : 0);

/**
 * The command palette: type to jump to a page or record or run an action. A modal dialog with
 * the ARIA combobox pattern: the input keeps focus, ↑ ↓ move the active option
 * (aria-activedescendant), ↵ runs it, Esc closes and focus returns. Results are grouped, ranked
 * forgivingly, and their count is announced. Open it with ⌘K / Ctrl+K from the app's shell
 * composition (useShortcut), and pass only what the person may do.
 */
export function CommandPalette({
  groups,
  query: controlledQuery,
  onQueryChange,
  label = 'Command palette',
  placeholder = 'Search or jump to…',
  loading = false,
  emptyMessage = 'Nothing matches. Try another word.',
  countMessage = (count) => (count === 1 ? '1 result' : `${String(count)} results`),
  maxPerGroup = 6,
  platform,
  open,
  defaultOpen = false,
  onOpenChange,
  UNSAFE_className,
  UNSAFE_style,
}: CommandPaletteProps) {
  const id = useId();
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const isOpen = open ?? ownOpen;
  const [ownQuery, setOwnQuery] = useState('');
  const query = controlledQuery ?? ownQuery;
  const [active, setActive] = useState(0);

  const visible = useMemo(
    () =>
      groups
        .map((group) => {
          if (group.filter === 'none' || !query.trim()) return { ...group, items: group.items.slice(0, query.trim() ? undefined : maxPerGroup * 2) };
          const ranked = group.items
            .map((item, index) => ({ item, index, score: scoreItem(query, item) }))
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score || a.index - b.index)
            .slice(0, maxPerGroup)
            .map((r) => r.item);
          return { ...group, items: ranked };
        })
        .filter((group) => group.items.length > 0),
    [groups, query, maxPerGroup],
  );
  const flat = visible.flatMap((g) => g.items);
  const current = Math.min(active, Math.max(flat.length - 1, 0));
  const optionId = (index: number) => `${id}-option-${String(index)}`;

  const setQuery = (next: string) => {
    setActive(0);
    if (controlledQuery === undefined) setOwnQuery(next);
    onQueryChange?.(next);
  };

  const setOpen = (next: boolean) => {
    if (open === undefined) setOwnOpen(next);
    // Every opening starts from an empty query at the top of the list.
    if (!next) setQuery('');
    onOpenChange?.(next);
  };

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    setOpen(false);
    item.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const move = (to: number) => {
      event.preventDefault();
      const next = (to + flat.length) % Math.max(flat.length, 1);
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' });
    };
    if (event.key === 'ArrowDown') move(current + 1);
    else if (event.key === 'ArrowUp') move(current - 1);
    else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(flat[current]);
    }
  };

  let index = -1;
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="command-palette__overlay">
          <DialogPrimitive.Content className={cx('command-palette', UNSAFE_className)} style={UNSAFE_style} aria-describedby={undefined}>
            <DialogPrimitive.Title className="visually-hidden">{label}</DialogPrimitive.Title>
            <div className="command-palette__search">
              <Icon name="search" />
              <input
                className="command-palette__input"
                role="combobox"
                aria-label={label}
                aria-expanded={flat.length > 0}
                aria-controls={flat.length > 0 ? `${id}-listbox` : undefined}
                aria-autocomplete="list"
                aria-activedescendant={flat.length > 0 ? optionId(current) : undefined}
                placeholder={placeholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                spellCheck={false}
              />
              {loading ? <Spinner /> : null}
              <Kbd keys="escape" {...(platform ? { platform } : {})} />
            </div>
            <div className="command-palette__results">
              {flat.length > 0 ? (
                <div id={`${id}-listbox`} role="listbox" aria-label={label}>
                  {visible.map((group) => (
                    <div className="command-palette__group" role="group" aria-labelledby={`${id}-${group.id}`} key={group.id}>
                      <div className="command-palette__heading" id={`${id}-${group.id}`} role="presentation">
                        {group.label}
                      </div>
                      {group.items.map((item) => {
                        index += 1;
                        const mine = index;
                        return (
                          <div
                            key={item.id}
                            id={optionId(mine)}
                            className="command-palette__option"
                            role="option"
                            aria-selected={mine === current}
                            {...(item.shortcut ? { 'aria-keyshortcuts': ariaKeyShortcuts(item.shortcut, platform) } : {})}
                            onPointerMove={() => setActive(mine)}
                            onClick={() => run(item)}
                          >
                            {item.icon ? <Icon name={item.icon} /> : null}
                            <span className="command-palette__text">
                              <span className="command-palette__label">{item.label}</span>
                              {item.description ? <span className="command-palette__description">{item.description}</span> : null}
                            </span>
                            {item.shortcut ? <Kbd keys={item.shortcut} {...(platform ? { platform } : {})} /> : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : null}
              {flat.length === 0 && !loading ? <p className="command-palette__empty">{emptyMessage}</p> : null}
            </div>
            <div className="command-palette__footer">
              <span className="command-palette__hint">
                <Kbd keys="arrowup" {...(platform ? { platform } : {})} />
                <Kbd keys="arrowdown" {...(platform ? { platform } : {})} /> to move
              </span>
              <span className="command-palette__hint">
                <Kbd keys="enter" {...(platform ? { platform } : {})} /> to open
              </span>
              <span className="command-palette__count" role="status">
                {loading && flat.length === 0 ? 'Searching…' : countMessage(flat.length)}
              </span>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
