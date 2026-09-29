// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from '../../src/app/url/history';
import { HistoryProvider, useNavigate, useNavigationGuard } from '../../src/app/url/useUrlState';
import { VIEW_TRANSITIONS_ATTRIBUTE, viewTransitionsEnabled, withViewTransition } from '../../src/app/viewTransition';

/**
 * The view-transition helper (src/app/viewTransition.ts) is progressive enhancement: the update
 * always runs exactly once, and runs inside document.startViewTransition only when the browser has
 * it, the person hasn't asked for reduced motion and the test flag isn't set.
 */

type Start = (callback: () => void) => ViewTransition;

const settled = () => Promise.resolve(undefined);
const fakeTransition = (): ViewTransition =>
  ({ ready: settled(), updateCallbackDone: settled(), finished: settled(), skipTransition: () => undefined, types: new Set() }) as unknown as ViewTransition;

/** A startViewTransition that runs its callback at once, as a browser does a frame later. */
const installStart = (impl: Start = (callback) => (callback(), fakeTransition())) => {
  const start = vi.fn(impl);
  Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true, writable: true });
  return start;
};

const setReducedMotion = (reduce: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: reduce && query.includes('prefers-reduced-motion: reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }),
  });
};

beforeEach(() => setReducedMotion(false));
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, 'startViewTransition');
  Reflect.deleteProperty(window, 'matchMedia');
  document.documentElement.removeAttribute(VIEW_TRANSITIONS_ATTRIBUTE);
});

describe('withViewTransition', () => {
  it('runs the update directly, once, when the browser has no view transitions', () => {
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(viewTransitionsEnabled()).toBe(false);
  });

  it('runs the update inside a view transition when it is supported and motion is welcome', () => {
    const start = installStart();
    const update = vi.fn();
    withViewTransition(update);
    expect(start).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('skips the transition under prefers-reduced-motion: reduce', () => {
    const start = installStart();
    setReducedMotion(true);
    const update = vi.fn();
    withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('skips the transition when the test flag is set on <html>', () => {
    const start = installStart();
    document.documentElement.setAttribute(VIEW_TRANSITIONS_ATTRIBUTE, 'off');
    const update = vi.fn();
    withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('skips the transition when matchMedia is missing', () => {
    const start = installStart();
    Reflect.deleteProperty(window, 'matchMedia');
    const update = vi.fn();
    withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('still runs the update, once, when starting the transition throws', () => {
    installStart(() => {
      throw new DOMException('Transition was aborted', 'InvalidStateError');
    });
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('never runs the update twice, even when the browser calls back and then throws', () => {
    installStart((callback) => {
      callback();
      throw new DOMException('Transition was aborted', 'AbortError');
    });
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('leaves a skipped transition’s rejected promises handled', async () => {
    const rejected = () => {
      const promise = Promise.reject(new DOMException('Skipped', 'AbortError'));
      return promise;
    };
    installStart((callback) => {
      callback();
      return { ready: rejected(), updateCallbackDone: settled(), finished: rejected(), skipTransition: () => undefined } as unknown as ViewTransition;
    });
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    withViewTransition(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe('navigation and view transitions', () => {
  const wrapperFor = (history: ReturnType<typeof createMemoryHistory>) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <HistoryProvider history={history}>{children}</HistoryProvider>;
    };

  it('cross-fades a move to another path, and not a change of the query string alone', () => {
    const start = installStart();
    const history = createMemoryHistory('/records');
    const { result } = renderHook(() => useNavigate(), { wrapper: wrapperFor(history) });

    act(() => result.current('/records?view=open'));
    expect(start).not.toHaveBeenCalled();
    expect(history.location()).toEqual({ pathname: '/records', search: '?view=open' });

    act(() => result.current('/records/r-1'));
    expect(start).toHaveBeenCalledTimes(1);
    expect(history.location().pathname).toBe('/records/r-1');
    expect(history.entries().entries).toEqual(['/records', '/records?view=open', '/records/r-1']);
  });

  it('keeps replace a replace inside the transition', () => {
    installStart();
    const history = createMemoryHistory('/records');
    const { result } = renderHook(() => useNavigate(), { wrapper: wrapperFor(history) });
    act(() => result.current('/home', { replace: true }));
    expect(history.entries()).toEqual({ entries: ['/home'], index: 0 });
  });

  it('navigates at once, without a transition, under reduced motion', () => {
    const start = installStart();
    setReducedMotion(true);
    const history = createMemoryHistory('/records');
    const { result } = renderHook(() => useNavigate(), { wrapper: wrapperFor(history) });
    act(() => result.current('/home'));
    expect(start).not.toHaveBeenCalled();
    expect(history.location().pathname).toBe('/home');
  });

  it('holds navigation behind an armed guard, then cross-fades when the person proceeds', () => {
    const start = installStart();
    const history = createMemoryHistory('/records/new');
    const { result } = renderHook(() => ({ navigate: useNavigate(), guard: useNavigationGuard(true) }), { wrapper: wrapperFor(history) });

    act(() => result.current.navigate('/home'));
    expect(start).not.toHaveBeenCalled();
    expect(result.current.guard.pending).toBe('/home');

    act(() => result.current.guard.proceed());
    expect(start).toHaveBeenCalledTimes(1);
    expect(history.location().pathname).toBe('/home');
  });
});
