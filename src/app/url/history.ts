/**
 * Where URL state is read from and written to. The browser's history in the app; an in-memory
 * history in stories and tests, so the gallery never rewrites its own URL and Back can be tested.
 * A product with a router adapts the router to this interface instead.
 */
export interface UrlHistory {
  /** The current path and query ("/records", "?view=open"). */
  location: () => { pathname: string; search: string };
  /** A new entry: Back returns to where this was called from. */
  push: (url: string) => void;
  /** Rewrite the current entry: Back skips it. */
  replace: (url: string) => void;
  /** Called after every change, including Back and Forward. Returns an unsubscribe. */
  subscribe: (listener: () => void) => () => void;
}

/**
 * The browser's history. pushState/replaceState emit no event, so writes notify listeners
 * themselves; Back and Forward arrive as popstate.
 */
export const browserHistory = (): UrlHistory => {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    location: () => ({ pathname: window.location.pathname, search: window.location.search }),
    push: (url) => {
      window.history.pushState(null, '', url);
      notify();
    },
    replace: (url) => {
      window.history.replaceState(null, '', url);
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      window.addEventListener('popstate', listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('popstate', listener);
      };
    },
  };
};

export interface MemoryHistory extends UrlHistory {
  back: () => void;
  forward: () => void;
  /** Every entry, oldest first, and which one is current. For tests. */
  entries: () => { entries: readonly string[]; index: number };
}

export const createMemoryHistory = (initial = '/'): MemoryHistory => {
  const stack = [initial];
  let index = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const split = (url: string) => {
    const at = url.indexOf('?');
    return at === -1 ? { pathname: url, search: '' } : { pathname: url.slice(0, at), search: url.slice(at) };
  };
  return {
    location: () => split(stack[index] ?? '/'),
    push: (url) => {
      stack.splice(index + 1, stack.length, url);
      index = stack.length - 1;
      notify();
    },
    replace: (url) => {
      stack[index] = url;
      notify();
    },
    back: () => {
      if (index === 0) return;
      index -= 1;
      notify();
    },
    forward: () => {
      if (index >= stack.length - 1) return;
      index += 1;
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    entries: () => ({ entries: [...stack], index }),
  };
};
