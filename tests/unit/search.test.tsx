// @vitest-environment jsdom
/**
 * Workspace search: the matching rules (shared by the server and the highlights), the URL codec,
 * the mock API (ranked, faceted, permission-aware) and the results page with its keyboard.
 */
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getSearch, type SearchQuery } from '../../src/app/api/search';
import { db, setRoles } from '../../src/app/mocks/db';
import { highlightParts, matchRanges, searchScore } from '../../src/app/model/searchRules';
import { searchCodec, searchHref } from '../../src/app/url/searchState';
import { SearchPage } from '../../src/examples/SearchPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

const query = (q: string, rest: Partial<SearchQuery> = {}): SearchQuery => ({ q, type: '', status: [], page: 1, pageSize: 50, ...rest });

describe('search rules', () => {
  it('matches folded text and points into the original, accents included', () => {
    expect(matchRanges('Mateo García', 'garcia')).toEqual([[6, 12]]);
    expect(matchRanges('Lease and lease', 'LEASE')).toEqual([
      [0, 5],
      [10, 15],
    ]);
    expect(matchRanges('Anything', ' ')).toEqual([]);
    expect(highlightParts('Hardware lease', [[9, 14]])).toEqual([
      { text: 'Hardware ', match: false },
      { text: 'lease', match: true },
    ]);
    expect([searchScore([[0, 2]], []), searchScore([[3, 5]], []), searchScore([], [[0, 1]])]).toEqual([3, 2, 1]);
  });

  it('keeps search in the URL, and ignores what it doesn’t know', () => {
    expect(searchCodec.parse('?q=lease&type=spaceship&status=pending,nope&page=0')).toEqual({ q: 'lease', type: '', status: ['pending'], page: 1 });
    expect(searchCodec.serialise({ q: 'lease', type: 'record', status: ['pending', 'overdue'], page: 2 })).toBe('q=lease&type=record&status=pending,overdue&page=2');
    expect(searchHref('  north  ')).toBe('/search?q=north');
  });
});

describe('the mock search API', () => {
  it('ranks, counts facets for the query alone, and filters by type and status', async () => {
    const all = await getSearch('acme', query('lease'));
    expect(all.total).toBe(all.facets.types.record + all.facets.types.account + all.facets.types.person);
    expect(all.items.every((h) => h.titleMatches.length > 0 || h.detailMatches.length > 0)).toBe(true);
    const pending = await getSearch('acme', query('lease', { type: 'record', status: ['pending'] }));
    expect(pending.total).toBe(all.facets.statuses.pending);
    expect(pending.facets).toEqual(all.facets);
    expect(pending.items.every((h) => h.type === 'record' && h.status === 'pending')).toBe(true);
  });

  it('finds a person by name and every record they own by its second line', async () => {
    const results = await getSearch('acme', query('priya'));
    expect(results.items[0]).toMatchObject({ type: 'person', title: 'Priya Natarajan', titleMatches: [[0, 5]] });
    const owned = db('acme').records.filter((r) => r.ownerId === 'acme-p02' && r.status !== 'archived').length;
    expect(results.facets.types.record).toBe(owned);
  });

  it('leaves out archived records, and drafts for a viewer', async () => {
    const admin = await getSearch('acme', query('lease'));
    expect(admin.facets.statuses.archived).toBe(0);
    setRoles('viewer');
    const viewer = await getSearch('acme', query('lease'));
    expect(viewer.facets.statuses.draft).toBe(0);
    expect(viewer.facets.types.record).toBe(admin.facets.types.record - admin.facets.statuses.draft);
  });

  it('answers nothing for a query under two characters', async () => {
    expect((await getSearch('acme', query('l'))).total).toBe(0);
  });
});

describe('the search page', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('lists results with highlights, moves with j and k, and narrows by type through the URL', async () => {
    const { history } = renderWithApp(<SearchPage />, { url: '/search?q=priya' });
    const results = await screen.findByRole('list', { name: 'Results' }, FIRST_PAINT);
    const links = within(results).getAllByRole('link');
    expect(links[0]?.textContent).toBe('Priya Natarajan');
    expect(links[0]?.querySelector('strong')?.textContent).toBe('Priya');
    act(() => void fireEvent.keyDown(document.body, { key: 'j' }));
    expect(document.activeElement).toBe(links[0]);
    act(() => void fireEvent.keyDown(document.body, { key: 'j' }));
    expect(document.activeElement).toBe(links[1]);
    act(() => void fireEvent.keyDown(document.body, { key: 'k' }));
    expect(document.activeElement).toBe(links[0]);
    fireEvent.click(screen.getByRole('link', { name: /^Records \(\d+\)$/ }));
    expect(searchCodec.parse(history.location().search).type).toBe('record');
    await screen.findByRole('group', { name: 'Record status' });
  });

  it('keeps the results one tab stop that ↑ ↓ and j k move alike, with each result’s place in the set', async () => {
    renderWithApp(<SearchPage />, { url: '/search?q=north' });
    const results = await screen.findByRole('list', { name: 'Results' }, FIRST_PAINT);
    const links = within(results).getAllByRole('link');
    expect(links.length).toBeGreaterThan(2);
    expect(links.filter((link) => link.tabIndex === 0)).toEqual([links[0]]);
    const items = within(results).getAllByRole('listitem');
    expect(items[0]?.getAttribute('aria-posinset')).toBe('1');
    expect(Number(items[0]?.getAttribute('aria-setsize'))).toBeGreaterThanOrEqual(links.length);
    act(() => links[0]?.focus());
    fireEvent.keyDown(links[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(links[1]);
    act(() => void fireEvent.keyDown(links[1] as HTMLElement, { key: 'j' }));
    expect(document.activeElement).toBe(links[2]);
    expect(links.filter((link) => link.tabIndex === 0)).toEqual([links[2]]);
    fireEvent.keyDown(links[2] as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(links[0]);
  });

  it('says there’s nothing, and offers to clear the filters that hid the matches', async () => {
    const { history } = renderWithApp(<SearchPage />, { url: '/search?q=lease&type=person' });
    fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }, FIRST_PAINT));
    expect(searchCodec.parse(history.location().search)).toEqual({ q: 'lease', type: '', status: [], page: 1 });
    expect(await screen.findByRole('list', { name: 'Results' })).toBeTruthy();
  });
});
