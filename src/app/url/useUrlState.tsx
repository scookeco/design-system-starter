/**
 * URL state: the parts of a view a copied link should reproduce (search, filters, sort, page,
 * tab) live in the query string, parsed and validated at the boundary like any other input.
 *
 * History is a product decision, made per write:
 *   push     deliberate navigation (a tab, a page): Back returns to where you were
 *   replace  a refinement of where you are (a filter, a sort, debounced search): Back skips it
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { browserHistory, type UrlHistory } from './history';

/** Parses a query string into state (never throws: unknown or invalid values fall back to defaults) and back. */
export interface UrlCodec<T> {
  parse: (search: string) => T;
  /** The query string without "?", defaults omitted, in a stable order. */
  serialise: (state: T) => string;
}

const HistoryContext = createContext<UrlHistory | null>(null);

export function HistoryProvider({ history, children }: { history: UrlHistory; children: ReactNode }) {
  return <HistoryContext value={history}>{children}</HistoryContext>;
}

let defaultHistory: UrlHistory | undefined;
const useHistory = () => {
  const history = useContext(HistoryContext);
  return history ?? (defaultHistory ??= browserHistory());
};

export interface UrlStateActions<T> {
  /** Navigate: a new history entry. */
  push: (next: Partial<T>) => void;
  /** Refine: rewrite the current entry. */
  replace: (next: Partial<T>) => void;
  /** The href for a state (for links, so they open in a new tab too). */
  href: (next: Partial<T>) => string;
}

export function useUrlState<T>(codec: UrlCodec<T>): [T, UrlStateActions<T>] {
  const history = useHistory();
  const search = useSyncExternalStore(history.subscribe, () => history.location().search);
  const state = useMemo(() => codec.parse(search), [codec, search]);

  const href = useCallback(
    (next: Partial<T>) => {
      // Read the latest URL, not the render's: two writes in one event must not undo each other.
      const current = codec.parse(history.location().search);
      const query = codec.serialise({ ...current, ...next });
      return `${history.location().pathname}${query ? `?${query}` : ''}`;
    },
    [codec, history],
  );
  const actions = useMemo<UrlStateActions<T>>(
    () => ({
      push: (next) => history.push(href(next)),
      replace: (next) => history.replace(href(next)),
      href,
    }),
    [history, href],
  );
  return [state, actions];
}

/**
 * A text input bound to a URL value with a debounce: the field updates on every keystroke, the URL
 * (and so the query) only once typing pauses, with replace, so Back never steps through keystrokes.
 * When the URL changes underneath (Back, a link), the field follows it.
 */
export function useDebouncedUrlText(value: string, commit: (next: string) => void, delayMs = 300): [string, (next: string) => void] {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  // The URL moved on its own (Back, a link): show what it now says.
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => commit(text), delayMs);
    return () => clearTimeout(timer);
  }, [text, value, commit, delayMs]);
  return [text, setText];
}
