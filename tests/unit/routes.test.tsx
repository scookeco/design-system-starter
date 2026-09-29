// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ROLE_CAPABILITIES } from '../../src/app/model/permissions';
import { CAPABILITIES } from '../../src/app/api/schemas';
import { seedRecords } from '../../src/app/mocks/seed';
import { matchPath, matchRoute } from '../../src/app/routing/routes';
import { ExampleApp } from '../../src/examples/App';
import { ROUTES } from '../../src/examples/routes';
import { captureTelemetry, FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();
const events = captureTelemetry();

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('the route table', () => {
  it('gives every route a guard, a layout and a unique path', () => {
    for (const route of ROUTES) {
      expect(CAPABILITIES).toContain(route.guard);
      expect(['shell', 'focused']).toContain(route.layout);
    }
    expect(new Set(ROUTES.map((r) => r.path)).size).toBe(ROUTES.length);
  });

  it('matches exact segments and params, specific paths first', () => {
    expect(matchPath('/records/:id', '/records/r-1001/')).toEqual({ id: 'r-1001' });
    expect(matchPath('/records/:id', '/records')).toBeUndefined();
    expect(matchRoute(ROUTES, '/records/new')?.route.guard).toBe('record:create');
    expect(matchRoute(ROUTES, '/records/r-1001')?.params).toEqual({ id: 'r-1001' });
    expect(matchRoute(ROUTES, '/nowhere')).toBeUndefined();
  });

  it('renders the 404 page for an unknown path', () => {
    renderWithApp(<ExampleApp />, { url: '/no/such/page' });
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
  });

  it('loads each page lazily, and navigates through LinkProvider: a row link opens the record in place', async () => {
    const { history } = renderWithApp(<ExampleApp />, { url: '/records' });
    // The list's chunk loads on first visit: its pager is the signal that the lazy page resolved and its query settled.
    const pager = await screen.findByRole('navigation', { name: 'Records pages' }, FIRST_PAINT);
    expect(within(pager).getByRole('status').textContent).toMatch(/^1–10 of /);
    const first = seedRecords('acme')
      .filter((r) => r.status !== 'archived')
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id))[0];
    fireEvent.click(await screen.findByRole('link', { name: first?.name ?? '?' }));
    expect(history.location().pathname).toBe(`/records/${first?.id ?? ''}`);
    expect(await screen.findByRole('heading', { level: 1, name: first?.name ?? '?' }, FIRST_PAINT)).toBeTruthy();
    // Back returns to the list.
    act(() => history.back());
    expect(await screen.findByRole('navigation', { name: 'Records pages' })).toBeTruthy();
  }, PAGE_FLOW_TIMEOUT);

  it('guards every route with the same predicate: a viewer gets the 403 page at /records/new', () => {
    renderWithApp(<ExampleApp />, { url: '/records/new', role: 'viewer' });
    expect(screen.getByRole('heading', { level: 1, name: 'You don’t have access to this page' })).toBeTruthy();
  });

  it('routes a section link to the same page with the section open', async () => {
    renderWithApp(<ExampleApp />, { url: '/records/r-1002/activity' });
    expect(await screen.findByRole('textbox', { name: 'Add a comment' }, FIRST_PAINT)).toBeTruthy();
  }, PAGE_FLOW_TIMEOUT);
});

/** A real link to each route: its params filled with seeded ids and sections that exist. */
const PARAMS: Record<string, string> = { id: 'r-1002', section: 'activity' };
const deepLink = (path: string) =>
  path
    .replace(/^\/accounts\/:id/, '/accounts/acme-a01')
    .replace(/^\/people\/:id/, '/people/acme-p01')
    .replace(/^\/settings\/:section/, '/settings/notifications')
    .replace(/:(\w+)/g, (_, name: string) => PARAMS[name] ?? name);

const NOT_A_PAGE = ['Page not found', 'You don’t have access to this page', 'This page couldn’t be shown', 'This page couldn’t load', 'This page still couldn’t load'];

/** Mounted at `url`: waits for the page's h1 and for its reads to settle, and returns the h1's text. */
const openDeepLink = async (url: string, role: 'admin' | 'viewer') => {
  const { client } = renderWithApp(<ExampleApp />, { url, role });
  const heading = await screen.findByRole('heading', { level: 1 }, FIRST_PAINT);
  await waitFor(() => expect(client.isFetching()).toBe(0), FIRST_PAINT);
  return screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)[0] ?? heading.textContent;
};

describe('a deep link to every route renders its page, or its 403, without crashing', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it.each(ROUTES.map((route) => [route.path, deepLink(route.path)] as const))('%s (%s), as an admin: the page', async (_path, url) => {
    const h1 = await openDeepLink(url, 'admin');
    expect(NOT_A_PAGE).not.toContain(h1);
    // Nothing threw on the way: no render failure reported, so no error boundary is hiding a crash.
    expect(events.filter((e) => e.kind === 'render')).toEqual([]);
  });

  const forbidden = ROUTES.filter((route) => !ROLE_CAPABILITIES.viewer.includes(route.guard));
  it.each(forbidden.map((route) => [route.path, deepLink(route.path)] as const))('%s (%s), as a viewer: the 403 page', async (_path, url) => {
    expect(await openDeepLink(url, 'viewer')).toBe('You don’t have access to this page');
    expect(events.filter((e) => e.kind === 'render')).toEqual([]);
  });

  it('covers every route (and viewers are refused somewhere)', () => {
    expect(new Set(ROUTES.map((r) => deepLink(r.path))).size).toBe(ROUTES.length);
    expect(ROUTES.every((r) => !deepLink(r.path).includes(':'))).toBe(true);
    expect(forbidden.length).toBeGreaterThan(0);
  });
});
