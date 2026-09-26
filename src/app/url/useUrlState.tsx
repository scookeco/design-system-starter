/**
 * URL state: the parts of a view a copied link should reproduce (search, filters, sort, page,
 * tab) live in the query string, parsed and validated at the boundary like any other input.
 *
 * History is a product decision, made per write:
 *   push     deliberate navigation (a tab, a page): Back returns to where you were
 *   replace  a refinement of where you are (a filter, a sort, debounced search): Back skips it
 *
 * The policy, as the example app applies it:
 *   push      open a record, a section of it, the edit form (links); a list tab, page or display;
 *             choosing a saved view
 *   replace   search (once typing pauses), filters, sort, columns; a default applied to a bare URL
 *   neither   saving a form (the page stays; its draft is cleared), a live update, an undo
 * Back (a pop) restores what the person left: a list's scroll and focus on the row they opened
 * (src/app/url/restoration.ts). A dirty form holds in-app navigation until the person decides
 * (useNavigationGuard, below).
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
/** The history URL state reads and writes: the provided one, or the browser's. */
export const useHistory = () => {
  const history = useContext(HistoryContext);
  return history ?? (defaultHistory ??= browserHistory());
};

/**
 * Navigation guards, per history: while a guard is armed (a form with unsaved changes), in-app
 * navigation (links through AppLink, useNavigate) is held and handed to the guard, which asks the
 * person, then proceeds or stays. Back and Forward aren't intercepted: the browser has already
 * moved, so the draft's autosave (src/app/model/drafts.ts) is what keeps the work.
 */
interface Guard {
  armed: number;
  pending: { href: string; replace: boolean } | undefined;
  listeners: Set<() => void>;
}
const guards = new WeakMap<UrlHistory, Guard>();
const guardFor = (history: UrlHistory): Guard => {
  let guard = guards.get(history);
  if (!guard) {
    guard = { armed: 0, pending: undefined, listeners: new Set() };
    guards.set(history, guard);
  }
  return guard;
};
const notifyGuard = (guard: Guard) => guard.listeners.forEach((listener) => listener());

/** Navigate to a path: push (a new entry) by default, replace to rewrite this one. Held while a guard is armed. */
export function useNavigate() {
  const history = useHistory();
  return useCallback(
    (href: string, { replace = false }: { replace?: boolean } = {}) => {
      const guard = guardFor(history);
      if (guard.armed > 0) {
        guard.pending = { href, replace };
        notifyGuard(guard);
        return;
      }
      if (replace) history.replace(href);
      else history.push(href);
    },
    [history],
  );
}

export interface NavigationGuard {
  /** Where the person tried to go, while the guard asks. */
  pending: string | undefined;
  /** Go there after all (the guard stands down first). */
  proceed: () => void;
  /** Stay here. */
  stay: () => void;
}

/** Hold in-app navigation while `when` (unsaved changes), and say where the person tried to go. */
export function useNavigationGuard(when: boolean): NavigationGuard {
  const history = useHistory();
  const guard = guardFor(history);
  useEffect(() => {
    if (!when) return;
    guard.armed += 1;
    return () => {
      guard.armed -= 1;
    };
  }, [guard, when]);
  const pending = useSyncExternalStore(
    useCallback(
      (listener: () => void) => {
        guard.listeners.add(listener);
        return () => guard.listeners.delete(listener);
      },
      [guard],
    ),
    () => guard.pending?.href,
  );
  const stay = useCallback(() => {
    guard.pending = undefined;
    notifyGuard(guard);
  }, [guard]);
  const proceed = useCallback(() => {
    const target = guard.pending;
    guard.pending = undefined;
    notifyGuard(guard);
    if (!target) return;
    if (target.replace) history.replace(target.href);
    else history.push(target.href);
  }, [guard, history]);
  return { pending, proceed, stay };
}

/** The current path, following Back, Forward and every push. */
export function usePathname() {
  const history = useHistory();
  return useSyncExternalStore(history.subscribe, () => history.location().pathname);
}

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
