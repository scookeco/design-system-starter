// @vitest-environment jsdom
/**
 * A page whose code fails to load (a dropped connection, a deploy that replaced the chunk), in the
 * real app: the error state says so, inside a working shell, and Try again fetches the code again
 * and shows the page. With React.lazy a failed import was kept forever, so Try again failed the
 * same way and only a full reload got out. If Try again fails too, the next step is Reload the page.
 *
 * The route table gets extra rows in front of the real ones, each with a scripted import: the
 * listed outcomes in order, then the real dashboard. One row per test, because a page's loader
 * (and what it has loaded) lives as long as the module.
 */
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Route, RouteProps } from '../../src/app/routing/routes';
import { FIELD_REGISTRY } from '../../src/app/registries/fields';
import { ExampleApp } from '../../src/examples/App';
import { captureTelemetry, FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

const script = vi.hoisted(() => ({
  // The chunk's URL is in the browser's message: it must never reach telemetry.
  failure: () => new TypeError('Failed to fetch dynamically imported module: https://cdn.example/assets/DashboardPage-9c1e.js'),
  outcomes: {
    '/flaky/once': ['fail'],
    '/flaky/twice': ['fail', 'fail'],
  } as Record<string, ('fail' | 'load')[]>,
  loads: {} as Record<string, number>,
}));

vi.mock('../../src/examples/routes', async (importOriginal) => {
  const original = await importOriginal<{ ROUTES: readonly Route[] }>();
  const { lazyPage } = await import('../../src/app/routing/lazyPage');
  const flaky = (path: string): Route => ({
    path,
    layout: 'shell',
    guard: 'workspace:read',
    nav: '/home',
    page: lazyPage<RouteProps>(async () => {
      script.loads[path] = (script.loads[path] ?? 0) + 1;
      if (script.outcomes[path]?.shift() === 'fail') throw script.failure();
      const { DashboardPage } = await import('../../src/examples/DashboardPage');
      return (() => <DashboardPage />) as ComponentType<RouteProps>;
    }),
  });
  return { ROUTES: [...Object.keys(script.outcomes).map(flaky), ...original.ROUTES] };
});

setupMockApi();
const events = captureTelemetry();

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// React logs every error a boundary catches; these are on purpose.
const quietReact = () => vi.spyOn(console, 'error').mockImplementation(() => undefined);

describe('a page whose code fails to load', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('says so inside a working shell, and Try again fetches the code again and shows the page', async () => {
    quietReact();
    renderWithApp(<ExampleApp />, { url: '/flaky/once' });

    expect(await screen.findByRole('heading', { level: 1, name: 'This page couldn’t load' }, FIRST_PAINT)).toBeTruthy();
    expect(screen.getByText('Check your connection and try again. Nothing you did caused this, and nothing was lost.')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    // Reported like a render failure, under the route's pattern, by class: PageLoadError. No URL, no message.
    expect(events.filter((e) => e.kind === 'render')).toEqual([{ kind: 'render', phase: 'failure', region: '/flaky/once', code: 'PageLoadError' }]);
    expect(JSON.stringify(events)).not.toContain('cdn.example');
    expect(script.loads['/flaky/once']).toBe(1);

    // The connection is back: Try again imports the page's code again, and the page renders.
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' }, FIRST_PAINT)).toBeTruthy();
    expect(script.loads['/flaky/once']).toBe(2);
    expect(events.filter((e) => e.kind === 'render')).toHaveLength(1);
  });

  it('offers Reload the page, with focus on it, when Try again fails too', async () => {
    quietReact();
    renderWithApp(<ExampleApp />, { url: '/flaky/twice' });

    expect(await screen.findByRole('heading', { level: 1, name: 'This page couldn’t load' }, FIRST_PAINT)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reload the page' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    // Still failing (a deploy may have removed the old chunk): the next step is a full reload.
    expect(await screen.findByRole('heading', { level: 1, name: 'This page still couldn’t load' }, FIRST_PAINT)).toBeTruthy();
    const reload = screen.getByRole('button', { name: 'Reload the page' });
    expect(document.activeElement).toBe(reload);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toBeTruthy();
    expect(script.loads['/flaky/twice']).toBe(2);
    expect(events.filter((e) => e.kind === 'render').map((e) => e.code)).toEqual(['PageLoadError', 'PageLoadError']);
  });

  it('leaves a renderer that throws as it was: the render error state, and Try again (never Reload) each time', async () => {
    quietReact();
    // The record page's code loads; the registry's money entry throws while it renders.
    const display = vi.spyOn(FIELD_REGISTRY.money, 'display').mockImplementation(() => {
      throw new Error('The money renderer failed.');
    });
    renderWithApp(<ExampleApp />, { url: '/records/r-1001' });
    expect(await screen.findByRole('heading', { level: 1, name: 'This page couldn’t be shown' }, FIRST_PAINT)).toBeTruthy();
    const reported = () => events.filter((e) => e.kind === 'render');
    const before = reported().length;

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(reported().length).toBeGreaterThan(before));
    expect(await screen.findByRole('heading', { level: 1, name: 'This page couldn’t be shown' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reload the page' })).toBeNull();
    expect(reported().every((e) => e.code === 'Error')).toBe(true);
    display.mockRestore();
  });
});
