// @vitest-environment jsdom
/**
 * The list at scale: a deterministic 10,000-record dataset, paged on the server as always, and the
 * Scroll display, which renders only the rows in view while staying a table (aria-rowcount, row
 * indexes), with keyboard movement and selection intact.
 */
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resetDb, db } from '../../src/app/mocks/db';
import { LARGE_DATASET_COUNT, seedRecords } from '../../src/app/mocks/seed';
import { ListPage } from '../../src/examples/ListPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, setupMockApi } from './app-harness';

setupMockApi();
afterEach(cleanup);

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/** What the All tab holds for an admin: everything but archived. */
const allTab = () => db('acme').records.filter((r) => r.status !== 'archived');
const byName = (a: { name: string; id: string }, b: { name: string; id: string }) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id);

const table = () => screen.getByRole('table', { name: 'Records' });
/** The data rows on screen (not the header, not placeholders or spacers). */
const dataRows = () => within(table()).getAllByRole('row').filter((row) => Number(row.getAttribute('aria-rowindex')) > 1);
const indexes = () => dataRows().map((row) => Number(row.getAttribute('aria-rowindex')));
/** A record's link in the table, by id (names repeat across 10,000 records; ids don't). */
const linkTo = (id: string | undefined) => document.querySelector<HTMLAnchorElement>(`table a[href="/records/${id ?? '?'}"]`);
const findLinkTo = async (id: string | undefined, options = {}) => {
  await waitFor(() => expect(linkTo(id)).not.toBeNull(), options);
  return linkTo(id) as HTMLAnchorElement;
};
/** The row holding focus: its aria-rowindex. */
const focusedRow = () => document.activeElement?.closest('tr')?.getAttribute('aria-rowindex');

describe('the large dataset', () => {
  it('is deterministic, and its first records are the default seed exactly', () => {
    resetDb('large');
    expect(db('acme').records).toHaveLength(LARGE_DATASET_COUNT);
    expect(seedRecords('acme', LARGE_DATASET_COUNT)).toEqual(seedRecords('acme', LARGE_DATASET_COUNT));
    expect(seedRecords('acme', LARGE_DATASET_COUNT).slice(0, 240)).toEqual(seedRecords('acme'));
    // Globex is unchanged.
    expect(db('globex').records).toHaveLength(seedRecords('globex').length);
    resetDb();
    expect(db('acme').records).toHaveLength(240);
  });
});

describe('the list at 10,000 records', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('pages on the server as always, and offers the Scroll display', async () => {
    resetDb('large');
    renderWithApp(<ListPage />, { url: '/records' });
    const pager = await screen.findByRole('navigation', { name: 'Records pages' }, FIRST_PAINT);
    expect(within(pager).getByRole('status').textContent).toBe(`1–10 of ${allTab().length.toLocaleString('en-US')}`);
    expect(screen.getByRole('radio', { name: 'Scroll' })).toBeTruthy();
  });

  it('a list of the default size isn’t offered Scroll', async () => {
    renderWithApp(<ListPage />, { url: '/records' });
    await screen.findByRole('navigation', { name: 'Records pages' }, FIRST_PAINT);
    expect(screen.queryByRole('radio', { name: 'Scroll' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Board' })).toBeTruthy();
  });

  it('Scroll renders only the rows in view, as a table that knows its full length', async () => {
    resetDb('large');
    renderWithApp(<ListPage />, { url: '/records?display=scroll' });
    const expected = [...allTab()].sort(byName);
    await findLinkTo(expected[0]?.id, FIRST_PAINT);
    expect(table().getAttribute('aria-rowcount')).toBe(String(expected.length + 1));
    // A window, not the list: a few dozen rows at most, starting at the top, in the server's order.
    expect(dataRows().length).toBeGreaterThan(5);
    expect(dataRows().length).toBeLessThan(40);
    expect(indexes()[0]).toBe(2);
    expect(within(dataRows()[1] as HTMLElement).getByRole('link').getAttribute('href')).toBe(`/records/${expected[1]?.id ?? ''}`);
    expect(screen.getByText(`${expected.length.toLocaleString('en-US')} records`)).toBeTruthy();

    // Scrolled halfway: the rows there load and render, and the ones at the top are gone.
    const region = table().closest('[role="region"]') as HTMLElement;
    Object.defineProperty(region, 'scrollTop', { configurable: true, value: 5000 * 44 });
    fireEvent.scroll(region);
    await waitFor(() => expect(Math.min(...indexes())).toBeGreaterThan(4900));
    const middle = Math.min(...indexes()) - 2;
    await findLinkTo(expected[middle]?.id);
    expect(indexes()).not.toContain(2);
    expect(dataRows().length).toBeLessThan(40);
  });

  it('keyboard: ↓ moves to the next row’s control, End loads and focuses the last row, Home goes back', async () => {
    resetDb('large');
    renderWithApp(<ListPage />, { url: '/records?display=scroll' });
    const expected = [...allTab()].sort(byName);
    const first = await findLinkTo(expected[0]?.id, FIRST_PAINT);
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(linkTo(expected[1]?.id)));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End' });
    await waitFor(() => expect(document.activeElement).toBe(linkTo(expected.at(-1)?.id)));
    expect(focusedRow()).toBe(String(expected.length + 1));
    // The same column: from a checkbox, ↑ goes to the checkbox above.
    const checkbox = within(document.activeElement?.closest('tr') as HTMLElement).getByRole('checkbox');
    act(() => checkbox.focus());
    fireEvent.keyDown(checkbox, { key: 'ArrowUp' });
    await waitFor(() => expect(focusedRow()).toBe(String(expected.length)));
    expect(document.activeElement?.getAttribute('role')).toBe('checkbox');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    await waitFor(() => expect(focusedRow()).toBe('2'));
    expect(document.activeElement?.getAttribute('role')).toBe('checkbox');
  });

  it('selection: a row, then all 10,000 matching from the header, counted in the bar', async () => {
    resetDb('large');
    renderWithApp(<ListPage />, { url: '/records?display=scroll' });
    const expected = [...allTab()].sort(byName);
    await findLinkTo(expected[0]?.id, FIRST_PAINT);
    fireEvent.click(within(dataRows()[2] as HTMLElement).getByRole('checkbox'));
    expect(await screen.findByText('1 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: `Select all ${expected.length.toLocaleString('en-US')} matching` }));
    expect(await screen.findByText(`${expected.length.toLocaleString('en-US')} selected`)).toBeTruthy();
    expect(dataRows().every((row) => row.hasAttribute('data-selected'))).toBe(true);
  });
});
