// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ROLE_CAPABILITIES } from '../../src/app/model/permissions';
import { CAPABILITIES } from '../../src/app/api/schemas';
import { seedRecords } from '../../src/app/mocks/seed';
import { matchPath, matchRoute } from '../../src/app/routing/routes';
import { ACCOUNT, PERSON } from '../../src/app/registries/entities';
import { ExampleApp } from '../../src/examples/App';
import { GO_KEYS, PALETTE_ACTIONS } from '../../src/examples/CommandMenu';
import { HOME, ROUTES } from '../../src/examples/routes';
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
  }, PAGE_FLOW_TIMEOUT);

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
  }, PAGE_FLOW_TIMEOUT);

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

/**
 * Links that lead nowhere: every same-origin <a href> on screen whose path no route matches. Pages
 * are checked as rendered, so a nav item, a breadcrumb, a row link or a "Go to Home" left pointing at
 * a deleted page fails here, naming the path.
 */
const deadLinks = () =>
  [...document.querySelectorAll('a[href^="/"]')]
    .map((a) => new URL(a.getAttribute('href') ?? '', 'http://app.example').pathname)
    .filter((path) => !matchRoute(ROUTES, path));

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
    expect(deadLinks()).toEqual([]);
    // Nothing threw on the way: no render failure reported, so no error boundary is hiding a crash.
    expect(events.filter((e) => e.kind === 'render')).toEqual([]);
  });

  const forbidden = ROUTES.filter((route) => !ROLE_CAPABILITIES.viewer.includes(route.guard));
  it.each(forbidden.map((route) => [route.path, deepLink(route.path)] as const))('%s (%s), as a viewer: the 403 page', async (_path, url) => {
    expect(await openDeepLink(url, 'viewer')).toBe('You don’t have access to this page');
    expect(deadLinks()).toEqual([]);
    expect(events.filter((e) => e.kind === 'render')).toEqual([]);
  });

  it('covers every route (and viewers are refused somewhere)', () => {
    expect(new Set(ROUTES.map((r) => deepLink(r.path))).size).toBe(ROUTES.length);
    expect(ROUTES.every((r) => !deepLink(r.path).includes(':'))).toBe(true);
    expect(forbidden.length).toBeGreaterThan(0);
  });
});

describe('links that don’t render as anchors lead to a route too', () => {
  const resolves = (href: string) => matchRoute(ROUTES, new URL(href, 'http://app.example').pathname) !== undefined;

  it('Home, where the error pages and a workspace switch land', () => {
    expect(resolves(HOME)).toBe(true);
  });

  it('every palette action and every "g then …" jump', () => {
    expect(PALETTE_ACTIONS.map((a) => a.href).filter((href) => !resolves(href))).toEqual([]);
    expect(Object.keys(GO_KEYS).filter((href) => !resolves(href))).toEqual([]);
  });

  it('the record pages the palette’s account and people rows (and account links) open', () => {
    expect([ACCOUNT, PERSON].map((entity) => `${entity.path}/any-id`).filter((href) => !resolves(href))).toEqual([]);
  });

  it('the 404 page’s own links', () => {
    renderWithApp(<ExampleApp />, { url: '/nowhere' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found');
    expect(deadLinks()).toEqual([]);
  });

  it('finds the links it checks, and reports one to nowhere (controls)', () => {
    renderWithApp(<ExampleApp />, { url: '/nowhere' });
    expect(document.querySelectorAll('a[href^="/"]').length).toBeGreaterThan(1);
    const stray = document.createElement('a');
    stray.href = '/a-deleted-page?tab=1';
    document.body.append(stray);
    expect(deadLinks()).toEqual(['/a-deleted-page']);
    stray.remove();
  });
});
