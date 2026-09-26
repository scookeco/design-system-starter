// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { listViews, patchView, postView } from '../../src/app/api/views';
import { RECORD_COLUMNS } from '../../src/app/api/schemas';
import { currentUserId, db } from '../../src/app/mocks/db';
import { listCodec } from '../../src/app/url/listState';
import { ListPage } from '../../src/examples/ListPage';
import { renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;

const config = { view: 'open', q: '', status: ['overdue'], sort: '-amount', columns: ['owner', 'amount'], display: 'table' } as const;

describe('saved views on the server', () => {
  it('are stored per person, per workspace', async () => {
    expect((await listViews('acme')).items.map((v) => v.name)).toEqual(['Open leases', 'Pipeline board']);
    const saved = await postView('acme', { name: 'Overdue, big first', config: { ...config, status: [...config.status], columns: [...config.columns] } });
    expect(db('acme').views.get(currentUserId())?.some((v) => v.id === saved.id)).toBe(true);
    expect((await listViews('globex')).items.some((v) => v.id === saved.id)).toBe(false);
    await expect(postView('acme', { name: 'open leases', config: { ...config, status: [], columns: [] } })).rejects.toMatchObject({ status: 422, code: 'duplicate' });
  });

  it('keep one default per person per workspace', async () => {
    await patchView('acme', 'acme-v1', { isDefault: true });
    await patchView('acme', 'acme-v2', { isDefault: true });
    expect((await listViews('acme')).items.map((v) => v.isDefault)).toEqual([false, true]);
  });
});

const openViewMenu = async () => {
  fireEvent.keyDown(screen.getByRole('button', { name: 'View options' }), { key: 'Enter' });
  return screen.findByRole('menu');
};

describe('saved views on the list page', () => {
  it('choosing a view writes its config into the URL; changing anything shows Modified; Save changes stores it', async () => {
    const { history } = renderWithApp(<ListPage />, { url: '/records' });
    const select = await screen.findByRole('combobox', { name: 'Saved view' });
    await waitFor(() => expect(select.textContent).toBe('Unsaved view'));
    fireEvent.keyDown(select, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Open leases' }));
    const state = listCodec.parse(history.location().search);
    expect(state).toMatchObject({ view: 'open', q: 'lease', sort: '-amount', saved: 'acme-v1' });
    expect(history.entries().entries).toHaveLength(2); // pushed
    expect(screen.queryByText('Modified')).toBeNull();

    // Hide a column: the URL moves on from the saved view.
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Account' }));
    expect(listCodec.parse(history.location().search).columns).toEqual(RECORD_COLUMNS.filter((c) => c !== 'account'));
    expect(await screen.findByText('Modified')).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Account' })).toBeNull();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    const menu = await openViewMenu();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Save changes to “Open leases”' }));
    await waitFor(() => expect(screen.queryByText('Modified')).toBeNull());
    expect(db('acme').views.get(currentUserId())?.[0]?.config.columns).not.toContain('account');
  });

  it('saves what is on screen as a new view, renames it, makes it the default, then deletes it', async () => {
    const { history } = renderWithApp(<ListPage />, { url: '/records?view=open&status=overdue&sort=-amount&columns=owner,amount' });
    await screen.findByRole('combobox', { name: 'Saved view' });
    fireEvent.click(within(await openViewMenu()).getByRole('menuitem', { name: 'Save as new view…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Save view' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Overdue, big first' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save view' }));
    await waitFor(() => expect(listCodec.parse(history.location().search).saved).toMatch(/^acme-v\d+$/));
    const id = listCodec.parse(history.location().search).saved;
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Saved view' }).textContent).toBe('Overdue, big first'));

    fireEvent.click(within(await openViewMenu()).getByRole('menuitem', { name: 'Rename…' }));
    const rename = await screen.findByRole('dialog', { name: 'Rename view' });
    fireEvent.change(within(rename).getByLabelText('Name'), { target: { value: 'Overdue' } });
    fireEvent.click(within(rename).getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Saved view' }).textContent).toBe('Overdue'));

    fireEvent.click(within(await openViewMenu()).getByRole('menuitem', { name: 'Open by default' }));
    await waitFor(() => expect(db('acme').views.get(currentUserId())?.find((v) => v.id === id)?.isDefault).toBe(true));

    fireEvent.click(within(await openViewMenu()).getByRole('menuitem', { name: 'Delete view…' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Delete view?' })).getByRole('button', { name: 'Delete view' }));
    await waitFor(() => expect(listCodec.parse(history.location().search).saved).toBe(''));
    // What was on screen stays: only the link to the view is gone.
    expect(listCodec.parse(history.location().search)).toMatchObject({ view: 'open', status: ['overdue'], columns: ['owner', 'amount'] });
  });

  it('opens the default view when the list opens with nothing in its URL, and never over a shared link', async () => {
    await patchView('acme', 'acme-v2', { isDefault: true });
    const bare = renderWithApp(<ListPage />, { url: '/records' });
    await waitFor(() => expect(listCodec.parse(bare.history.location().search)).toMatchObject({ saved: 'acme-v2', display: 'board', sort: '-updated' }));
    // Replaced, not pushed: Back doesn't return to the empty URL.
    expect(bare.history.entries().entries).toHaveLength(1);
    cleanup();
    const linked = renderWithApp(<ListPage />, { url: '/records?view=archived' });
    await screen.findByRole('combobox', { name: 'Saved view' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Saved view' }).textContent).toBe('Unsaved view'));
    expect(listCodec.parse(linked.history.location().search)).toMatchObject({ view: 'archived', saved: '' });
  });
});
