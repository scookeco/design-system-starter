// @vitest-environment jsdom
/**
 * Notifications: the mock API (permission-aware counts, read, read all), the live path (counts at
 * once, rows never under the cursor, Show new), the optimistic mark read with rollback, and the
 * bell and the notification centre.
 */
import { act, cleanup, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { listNotifications, postAllNotificationsRead, postNotificationsRead } from '../../src/app/api/notifications';
import { setRoles } from '../../src/app/mocks/db';
import { anotherUser, mockLive } from '../../src/app/mocks/live';
import { BELL_QUERY, useMarkNotificationsRead, useNewNotifications, useNotifications } from '../../src/app/model/notifications';
import { notificationsCodec } from '../../src/app/url/b2bState';
import { NotificationsPage } from '../../src/examples/NotificationsPage';
import { FIRST_PAINT, PAGE_FLOW_TIMEOUT, renderWithApp, server, setupMockApi, testClient, wrapperFor } from './app-harness';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);
setupMockApi();

const ALL = { view: 'all', kind: '' } as const;

describe('the mock notifications API', () => {
  it('counts over everything visible, filters by view and kind, and leaves out drafts for a viewer', async () => {
    const all = await listNotifications('acme', ALL);
    const unread = await listNotifications('acme', { view: 'unread', kind: '' });
    expect(unread.items.every((n) => !n.read)).toBe(true);
    expect(unread.counts).toEqual(all.counts);
    expect(unread.items).toHaveLength(all.counts.unread);
    const mentions = await listNotifications('acme', { view: 'all', kind: 'mention' });
    expect(mentions.items.every((n) => n.kind === 'mention')).toBe(true);
    setRoles('viewer');
    expect((await listNotifications('acme', ALL)).counts.all).toBeLessThanOrEqual(all.counts.all);
  });

  it('marks some read or unread, and all read', async () => {
    const before = await listNotifications('acme', ALL);
    const first = before.items.find((n) => !n.read);
    if (!first) throw new Error('seed has no unread notification');
    await postNotificationsRead('acme', [first.id], true);
    expect((await listNotifications('acme', ALL)).counts.unread).toBe(before.counts.unread - 1);
    expect((await postAllNotificationsRead('acme')).marked).toBe(before.counts.unread - 1);
    expect((await listNotifications('acme', ALL)).counts.unread).toBe(0);
  });

  it('keeps the URL to known values', () => {
    expect(notificationsCodec.parse('?view=unread&kind=spam')).toEqual({ view: 'unread', kind: '' });
    expect(notificationsCodec.serialise({ view: 'all', kind: 'job' })).toBe('kind=job');
  });
});

describe('notifications in the cache', () => {
  it('a pushed one moves the counts at once, leaves the rows, and Show new brings it in', async () => {
    const client = testClient();
    const { result } = renderHook(() => ({ list: useNotifications(ALL), bell: useNotifications(BELL_QUERY), fresh: useNewNotifications() }), {
      wrapper: wrapperFor(client, 'acme', mockLive),
    });
    await waitFor(() => expect(result.current.list.isSuccess && result.current.bell.isSuccess).toBe(true));
    const before = result.current.list.data?.counts ?? { all: 0, unread: 0 };
    const rows = result.current.list.data?.items.length ?? 0;
    let id: string | undefined;
    act(() => {
      id = anotherUser('acme', { kind: 'notify' });
    });
    expect(result.current.bell.data?.counts.unread).toBe(before.unread + 1);
    expect(result.current.list.data?.items).toHaveLength(rows);
    expect(result.current.fresh.count).toBe(1);
    await act(() => result.current.fresh.show());
    await waitFor(() => expect(result.current.list.data?.items[0]?.id).toBe(id));
    expect(result.current.fresh.count).toBe(0);
  });

  it('marks read at once, and puts it back if the server says no', async () => {
    const client = testClient();
    const { result } = renderHook(() => ({ list: useNotifications(ALL), mark: useMarkNotificationsRead() }), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    const target = result.current.list.data?.items.find((n) => !n.read);
    const unread = result.current.list.data?.counts.unread ?? 0;
    // The server answers no, but only once the optimistic patch has been seen.
    let answer: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      answer = resolve;
    });
    server.use(
      http.post('*/api/t/acme/notifications/read', async () => {
        await gate;
        return HttpResponse.json({ error: { code: 'server_error', message: 'No.' } }, { status: 500 });
      }),
    );
    act(() => result.current.mark.mutate({ ids: [target?.id ?? ''], read: true }));
    await waitFor(() => expect(result.current.list.data?.counts.unread).toBe(unread - 1));
    answer();
    await waitFor(() => expect(result.current.mark.isError).toBe(true));
    expect(result.current.list.data?.counts.unread).toBe(unread);
    expect(result.current.list.data?.items.find((n) => n.id === target?.id)?.read).toBe(false);
  });
});

describe('the notification centre and the bell', { timeout: PAGE_FLOW_TIMEOUT }, () => {
  it('shows the unread count in the header, and Mark all read clears it everywhere', async () => {
    const { counts } = await listNotifications('acme', ALL);
    renderWithApp(<NotificationsPage />, { url: '/notifications' });
    const bell = await screen.findByRole('button', { name: `Notifications: ${String(counts.unread)} unread` }, FIRST_PAINT);
    expect(bell.textContent).toBe(String(counts.unread));
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    await screen.findByRole('button', { name: 'Notifications: 0 unread' });
    expect(screen.getByRole('heading', { level: 1, name: 'Notifications' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mark all read' })).toBeNull();
  });

  it('opening a row marks it read; the bell’s popover lists the latest unread', async () => {
    renderWithApp(<NotificationsPage initialBellOpen />, { url: '/notifications?view=unread' });
    const popover = await screen.findByRole('dialog', { name: 'Notifications' }, FIRST_PAINT);
    await within(popover).findAllByRole('link');
    expect(within(popover).getByRole('link', { name: 'See all notifications' })).toBeTruthy();
    const table = await screen.findByRole('table', { name: 'Unread notifications' });
    const first = within(table).getAllByRole('button', { name: /^Mark read: / })[0];
    const before = screen.getByRole('button', { name: /^Notifications: \d+ unread$/ }).getAttribute('aria-label');
    if (first) fireEvent.click(first);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Notifications/ }).getAttribute('aria-label')).not.toBe(before));
    // Still on the Unread list: it doesn't vanish under the cursor.
    expect(within(table).getAllByRole('button', { name: /^Mark unread: / })).toHaveLength(1);
  });
});
