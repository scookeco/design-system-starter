// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { toRow } from '../../src/app/model/projections';
import {
  deletableCount,
  EMPTY_SELECTION,
  filterKey,
  pageState,
  selectedCount,
  selectMatching,
  toBulkSelection,
  toggleRow,
  togglePage,
} from '../../src/app/model/selection';
import { seedRecords } from '../../src/app/mocks/seed';
import { ListPage } from '../../src/examples/ListPage';
import { jobSettings } from '../../src/app/model/jobs';
import { renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();

// jsdom has no ResizeObserver; Radix measures its hidden form inputs with one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const rows = seedRecords('acme').slice(0, 4).map(toRow);
const [a, b] = rows as [ReturnType<typeof toRow>, ReturnType<typeof toRow>];
const filter = { q: '', status: [], view: 'all' } as const;

describe('selection model', () => {
  it('selects a page, then clears it; the header box is indeterminate in between', () => {
    expect(pageState(EMPTY_SELECTION, rows)).toBe(false);
    const one = toggleRow(EMPTY_SELECTION, rows, a, true);
    expect(pageState(one, rows)).toBe('indeterminate');
    const page = togglePage(one, rows);
    expect(pageState(page, rows)).toBe(true);
    expect(selectedCount(page)).toBe(4);
    expect(selectedCount(togglePage(page, rows))).toBe(0);
  });

  it('selects everything matching as a filter, and sends the filter, not ids', () => {
    const all = selectMatching(filter, 219);
    expect(selectedCount(all)).toBe(219);
    expect(toBulkSelection(all)).toEqual({ filter });
    expect(toBulkSelection(toggleRow(EMPTY_SELECTION, rows, b, true))).toEqual({ ids: [b.id] });
  });

  it('narrows "all matching" to the page when one row is unticked', () => {
    const narrowed = toggleRow(selectMatching(filter, 219), rows, a, false);
    expect(narrowed.scope).toBe('ids');
    expect(selectedCount(narrowed)).toBe(3);
  });

  it('guards bulk delete with the canDelete predicate', () => {
    const held = { ...a, deletable: false };
    expect(deletableCount(toggleRow(toggleRow(EMPTY_SELECTION, rows, held, true), rows, b, true))).toBe(1);
  });

  it('keys a selection to the filter, not the page or sort', () => {
    expect(filterKey({ q: ' lease ', status: ['pending', 'active'], view: 'all' })).toBe(filterKey({ q: 'lease', status: ['active', 'pending'], view: 'all' }));
    expect(filterKey({ ...filter, q: 'x' })).not.toBe(filterKey(filter));
  });
});

describe('list page selection and bulk delete', () => {
  it('names each row checkbox, offers "Select all N matching", and shows the count in the bar', async () => {
    renderWithApp(<ListPage />, { url: '/records' });
    const header = await screen.findByRole('checkbox', { name: 'Select all on this page' });
    expect(screen.getAllByRole('checkbox', { name: /^Select (?!all)/ })).toHaveLength(10);
    fireEvent.click(header);
    expect(screen.getByText('10 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Select all 219 matching' }));
    expect(screen.getByText('219 selected')).toBeTruthy();
    expect(screen.getByText('All 219 matching records are selected.')).toBeTruthy();
  });

  it('clears the selection when the filter changes', async () => {
    const { history } = renderWithApp(<ListPage />, { url: '/records' });
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all on this page' }));
    expect(screen.getByText('10 selected')).toBeTruthy();
    act(() => history.replace('/records?status=active'));
    await waitFor(() => expect(screen.queryByText('10 selected')).toBeNull());
    // Paging keeps it.
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all on this page' }));
    act(() => history.push('/records?status=active&page=2'));
    expect(screen.getByText('10 selected')).toBeTruthy();
  });

  it('confirms with the count, then runs “all matching” as a job that reports its partial failure, with Retry', async () => {
    jobSettings.pollMs = 5;
    const drafts = seedRecords('acme').filter((r) => r.status === 'draft');
    const held = drafts.filter((r) => r.tags.includes('legal-hold'));
    renderWithApp(<ListPage initialSelection="matching" />, { url: '/records?view=drafts' });
    await screen.findByText(`${String(drafts.length)} selected`);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: `Delete ${String(drafts.length)} records?` });
    fireEvent.click(within(dialog).getByRole('button', { name: `Delete ${String(drafts.length)} records` }));
    await screen.findByText('Finished, with failures', {}, { timeout: 15_000 });
    expect(screen.getByRole('progressbar', { name: `Delete ${String(drafts.length)} records` }).getAttribute('aria-valuetext')).toBe(
      `${String(drafts.length - held.length)} done, ${String(held.length)} failed`,
    );
    expect(screen.getByRole('button', { name: `Retry ${String(held.length)} failed` })).toBeTruthy();
    expect(screen.queryByText(/selected$/)).toBeNull();
  }, 20_000);
});
