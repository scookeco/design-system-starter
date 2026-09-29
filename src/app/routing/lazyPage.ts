/**
 * A lazily loaded page that can be loaded again. It replaces React.lazy in the route table, because
 * React.lazy keeps a rejected import forever: once a page's code failed to load (the network
 * dropped, a deploy replaced the file), every later render throws the same error, and Try again
 * can't help. Only a full reload could.
 *
 * Like React.lazy, the page's module is fetched the first time it renders (one chunk per route),
 * every render while it loads shares that one import, and once it's here the page renders
 * synchronously on every later visit.
 *
 * Unlike React.lazy, a failed load is thrown as a `PageLoadError`, and `forget()` on that error
 * clears the failure so the next render imports the code again. The failure stays until then, on
 * purpose: React renders a failed page once more before it hands the error to the boundary, so a
 * failure cleared by the render that threw would start a new import instead of showing the error,
 * and a page that can never load would loop. RenderBoundary calls `forget()` from Try again, and
 * when a boundary that caught one unmounts (the person went elsewhere), so coming back loads afresh.
 */
import { createElement, type ComponentType } from 'react';

/** A page's code failed to load. Its `name` is what telemetry reports; its message says nothing specific. */
export class PageLoadError extends Error {
  // A literal, not the class's name: that is minified away in a production build.
  override name = 'PageLoadError';
  readonly #forget: () => void;

  constructor(forget: () => void, cause: unknown) {
    super('A page’s code failed to load.', { cause });
    this.#forget = forget;
  }

  /** Clear the failure, so the next render of the page imports its code again. */
  forget() {
    this.#forget();
  }
}

export const isPageLoadError = (error: unknown): error is PageLoadError => error instanceof PageLoadError;

type LoadState<P> =
  | { status: 'idle' }
  /** The one import every render shares. It always resolves: the outcome is the next state. */
  | { status: 'loading'; settled: Promise<void> }
  | { status: 'loaded'; Page: ComponentType<P> }
  | { status: 'failed'; error: PageLoadError };

/**
 * `load` resolves to the page component. The module is imported the first time the page renders,
 * never before; a failed import is retried only after `PageLoadError.forget()`.
 */
export function lazyPage<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let state: LoadState<P> = { status: 'idle' };

  const start = () => {
    const settled = load().then(
      (Page) => {
        state = { status: 'loaded', Page };
      },
      (cause: unknown) => {
        const error: PageLoadError = new PageLoadError(() => {
          // Only the failure this error reported: a newer load (or a loaded page) stays.
          if (state.status === 'failed' && state.error === error) state = { status: 'idle' };
        }, cause);
        state = { status: 'failed', error };
      },
    );
    state = { status: 'loading', settled };
    return settled;
  };

  // Read through a function: the state changes while a render waits, which TypeScript can't see.
  const current = (): LoadState<P> => state;

  function LazyPage(props: P) {
    if (current().status === 'idle') start();
    const pending = current();
    // Suspend until the import settles, by throwing it: the protocol React.lazy itself uses. (`use`
    // would do, but under act, as in the unit tests, a page it suspends never renders again.)
    if (pending.status === 'loading') throw pending.settled;
    const settled = current();
    if (settled.status === 'failed') throw settled.error;
    return settled.status === 'loaded' ? createElement(settled.Page, props) : null;
  }

  return LazyPage;
}
