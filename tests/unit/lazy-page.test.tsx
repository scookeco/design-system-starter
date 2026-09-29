// @vitest-environment jsdom
/**
 * The route table's lazy loader (lazyPage): one import however many renders ask, a loaded page
 * renders straight away on every later visit, and a failed import stays failed (thrown to the
 * boundary as PageLoadError, never re-imported by the render that threw) until the boundary's
 * Try again, or its unmounting, forgets it. The imports here are promises the test settles itself.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Component, Suspense, type ComponentType, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPageLoadError, lazyPage, PageLoadError } from '../../src/app/routing/lazyPage';
import { RenderBoundary } from '../../src/app/routing/RenderBoundary';
import { captureTelemetry } from './app-harness';

const events = captureTelemetry();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// React logs every error a boundary catches; these are on purpose.
const quietReact = () => vi.spyOn(console, 'error').mockImplementation(() => undefined);

interface Props {
  label: string;
}
const Loaded: ComponentType<Props> = ({ label }) => <p>{label}</p>;

/** An import the test settles: each call to `load` is one pending import, in order. */
function scriptedImport() {
  const pending: { resolve: (page: ComponentType<Props>) => void; reject: (error: unknown) => void }[] = [];
  const load = vi.fn(
    () =>
      new Promise<ComponentType<Props>>((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
  );
  const settle = async (outcome: 'resolve' | 'reject') => {
    const next = pending.shift();
    if (!next) throw new Error('No import is pending.');
    await act(async () => {
      if (outcome === 'resolve') next.resolve(Loaded);
      else next.reject(new TypeError('Failed to fetch dynamically imported module: https://cdn.example/assets/Page-3f2a.js'));
    });
  };
  return { load, settle };
}

const inBoundary = (Page: ComponentType<Props>, label = 'Page') => (
  <RenderBoundary region="/page" fallback={(retry, failure) => <button onClick={retry}>{`Retry ${failure.cause}${failure.repeated ? ' again' : ''}`}</button>}>
    <Suspense fallback={<p>Loading</p>}>
      <Page label={label} />
    </Suspense>
  </RenderBoundary>
);

describe('lazyPage', () => {
  it('imports only when first rendered, then renders the loaded page straight away on every later visit', async () => {
    const { load, settle } = scriptedImport();
    const Page = lazyPage(load);
    expect(load).not.toHaveBeenCalled();

    render(inBoundary(Page, 'First visit'));
    expect(screen.getByText('Loading')).toBeTruthy();
    await settle('resolve');
    expect(await screen.findByText('First visit')).toBeTruthy();
    cleanup();

    // Success is cached: no second import, and no Suspense fallback on the way.
    render(inBoundary(Page, 'Second visit'));
    expect(screen.getByText('Second visit')).toBeTruthy();
    expect(screen.queryByText('Loading')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shares one import between renders that ask at the same time', async () => {
    const { load, settle } = scriptedImport();
    const Page = lazyPage(load);
    render(
      <Suspense fallback={<p>Loading</p>}>
        <Page label="One" />
        <Page label="Two" />
      </Suspense>,
    );
    expect(load).toHaveBeenCalledTimes(1);
    await settle('resolve');
    expect(await screen.findByText('One')).toBeTruthy();
    expect(screen.getByText('Two')).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('throws a failed import to the boundary as PageLoadError, and imports again only on Try again', async () => {
    quietReact();
    const { load, settle } = scriptedImport();
    const Page = lazyPage(load);
    render(inBoundary(Page));

    await settle('reject');
    expect(await screen.findByRole('button', { name: 'Retry load' })).toBeTruthy();
    // React renders a failed component again before the boundary takes over: that must not re-import.
    expect(load).toHaveBeenCalledTimes(1);
    // Reported by class; the chunk's URL (in the message) never leaves.
    expect(events).toEqual([{ kind: 'render', phase: 'failure', region: '/page', code: 'PageLoadError' }]);
    expect(JSON.stringify(events)).not.toContain('cdn.example');

    // Try again forgets the failure: the page's code is imported again, and this time it loads.
    fireEvent.click(screen.getByRole('button', { name: 'Retry load' }));
    expect(load).toHaveBeenCalledTimes(2);
    await settle('resolve');
    expect(await screen.findByText('Page')).toBeTruthy();
  });

  it('never loops on an import that keeps failing: exactly one import per Try again, and the repeat is flagged', async () => {
    quietReact();
    const { load, settle } = scriptedImport();
    const Page = lazyPage(load);
    render(inBoundary(Page));

    await settle('reject');
    expect(await screen.findByRole('button', { name: 'Retry load' })).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Retry load' }));
    await settle('reject');
    expect(await screen.findByRole('button', { name: 'Retry load again' })).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Retry load again' }));
    await settle('reject');
    expect(await screen.findByRole('button', { name: 'Retry load again' })).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('keeps a failure until it is forgotten, and a boundary that unmounts forgets it', async () => {
    quietReact();
    const { load, settle } = scriptedImport();
    const Page = lazyPage(load);
    const first = render(inBoundary(Page));
    await settle('reject');
    expect(await within(first.container).findByRole('button', { name: 'Retry load' })).toBeTruthy();

    // Another render of the same page, without a retry, gets the same failure: no new import.
    const second = render(inBoundary(Page, 'Again'));
    expect(within(second.container).getByRole('button', { name: 'Retry load' })).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);

    // The person goes elsewhere: the boundaries unmount, and coming back imports afresh.
    second.unmount();
    first.unmount();
    render(inBoundary(Page, 'Came back'));
    expect(load).toHaveBeenCalledTimes(2);
    await settle('resolve');
    expect(await screen.findByText('Came back')).toBeTruthy();
  });

  it('forgets only the failure it reported: a stale error leaves a newer load alone', async () => {
    quietReact();
    const { load, settle } = scriptedImport();
    const Page = lazyPage(load);
    const caught: unknown[] = [];
    class Catch extends Component<{ children: ReactNode }, { failed: boolean }> {
      override state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      override componentDidCatch(error: unknown) {
        caught.push(error);
      }
      override render() {
        return this.state.failed ? <p>Caught</p> : this.props.children;
      }
    }
    const inCatch = (label: string) => (
      <Catch>
        <Suspense fallback={null}>
          <Page label={label} />
        </Suspense>
      </Catch>
    );

    render(inCatch('First'));
    await settle('reject');
    const stale = caught[0];
    expect(stale).toBeInstanceOf(PageLoadError);
    if (!isPageLoadError(stale)) return;
    stale.forget();
    cleanup();

    render(inCatch('Loaded'));
    expect(load).toHaveBeenCalledTimes(2);
    await settle('resolve');
    expect(await screen.findByText('Loaded')).toBeTruthy();

    // The old error's forget changes nothing now: the page stays loaded.
    stale.forget();
    cleanup();
    render(inCatch('Still loaded'));
    expect(screen.getByText('Still loaded')).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
