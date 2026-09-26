// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryHistory } from '../../src/app/url/history';
import { LIST_DEFAULTS, listCodec, type ListUrlState } from '../../src/app/url/listState';
import { ListPage } from '../../src/examples/ListPage';
import { renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();

describe('list URL codec', () => {
  const states: ListUrlState[] = [
    LIST_DEFAULTS,
    { ...LIST_DEFAULTS, view: 'open', q: 'lease', status: ['pending', 'overdue'], sort: '-amount', page: 3 },
    { ...LIST_DEFAULTS, view: 'archived', q: 'Café & co', status: ['archived'], sort: 'updated', display: 'board', saved: 'v-3' },
    { ...LIST_DEFAULTS, view: 'all', status: ['draft'], sort: '-name', page: 12, columns: ['status', 'amount'] },
    { ...LIST_DEFAULTS, columns: [] },
  ];

  it.each(states)('round-trips %o', (state) => {
    expect(listCodec.parse(listCodec.serialise(state))).toEqual(state);
  });

  it('writes defaults as nothing and keeps a stable, readable order', () => {
    expect(listCodec.serialise(LIST_DEFAULTS)).toBe('');
    expect(
      listCodec.serialise({ ...LIST_DEFAULTS, view: 'open', q: 'lease', status: ['pending', 'overdue'], sort: '-amount', page: 2, display: 'board', columns: ['owner', 'amount'], saved: 'v-1' }),
    ).toBe('view=open&q=lease&status=pending,overdue&sort=-amount&page=2&display=board&columns=owner,amount&saved=v-1');
  });

  it('validates at the boundary: unknown values fall back, never throw', () => {
    expect(listCodec.parse('?view=bogus&sort=price&page=-4&status=active,nope')).toEqual({ ...LIST_DEFAULTS, status: ['active'] });
    expect(listCodec.parse('?page=2.5').page).toBe(1);
    // A status the view can't show is dropped, and statuses come back in the filter's order, once each.
    expect(listCodec.parse('?view=open&status=active,overdue,pending,overdue').status).toEqual(['pending', 'overdue']);
  });
});

describe('memory history', () => {
  it('pushes entries, replaces the current one, and goes back', () => {
    const history = createMemoryHistory('/records');
    history.push('/records?page=2');
    history.replace('/records?page=2&sort=-name');
    expect(history.entries()).toEqual({ entries: ['/records', '/records?page=2&sort=-name'], index: 1 });
    history.back();
    expect(history.location()).toEqual({ pathname: '/records', search: '' });
    history.push('/records?view=open');
    expect(history.entries().entries).toEqual(['/records', '/records?view=open']);
  });
});

describe('list page URL state', () => {
  it('opens the view a link describes', async () => {
    renderWithApp(<ListPage />, { url: '/records?view=open&q=lease&status=overdue&page=1' });
    const views = screen.getByRole('navigation', { name: 'Record views' });
    await waitFor(() => expect(within(views).getByRole('link', { name: /^Open/ }).getAttribute('aria-current')).toBe('page'));
    expect((screen.getByRole('searchbox', { name: 'Search records' }) as HTMLInputElement).value).toBe('lease');
    expect(screen.getByRole('button', { name: 'Remove filter: status Overdue' })).toBeTruthy();
  });

  it('pushes a page change, so Back returns to the previous page', async () => {
    const { history } = renderWithApp(<ListPage />, { url: '/records' });
    const pager = await screen.findByRole('navigation', { name: 'Records pages' });
    fireEvent.click(within(pager).getByRole('button', { name: 'Next' }));
    expect(history.entries()).toEqual({ entries: ['/records', '/records?page=2'], index: 1 });
    await waitFor(() => expect(within(pager).getByRole('status').textContent).toBe('11–20 of 219'));
    act(() => history.back());
    await waitFor(() => expect(within(pager).getByRole('status').textContent).toBe('1–10 of 219'));
  });

  it('pushes a tab change, and a tab keeps the search but drops filters', async () => {
    const { history } = renderWithApp(<ListPage />, { url: '/records?q=lease&status=active' });
    const views = screen.getByRole('navigation', { name: 'Record views' });
    fireEvent.click(await within(views).findByRole('link', { name: /^Drafts/ }));
    expect(history.entries().entries).toEqual(['/records?q=lease&status=active', '/records?view=drafts&q=lease']);
  });

  it('replaces for refinements: a filter and a debounced search add no Back stops', async () => {
    const { history } = renderWithApp(<ListPage />, { url: '/records?page=3' });
    const search = screen.getByRole('searchbox', { name: 'Search records' });
    fireEvent.change(search, { target: { value: 'l' } });
    fireEvent.change(search, { target: { value: 'le' } });
    fireEvent.change(search, { target: { value: 'lease' } });
    // Not yet: the URL waits for typing to pause.
    expect(history.location().search).toBe('?page=3');
    await waitFor(() => expect(history.location().search).toBe('?q=lease'));
    expect(history.entries().entries).toHaveLength(1);
  });

  it('follows Back into the search field', async () => {
    const { history } = renderWithApp(<ListPage />, { url: '/records?q=lease' });
    act(() => history.push('/records?q=hosting'));
    await waitFor(() => expect((screen.getByRole('searchbox', { name: 'Search records' }) as HTMLInputElement).value).toBe('hosting'));
    act(() => history.back());
    await waitFor(() => expect((screen.getByRole('searchbox', { name: 'Search records' }) as HTMLInputElement).value).toBe('lease'));
  });
});
