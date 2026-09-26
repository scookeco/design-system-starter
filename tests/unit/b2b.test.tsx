// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getAuditExport, listAudit, listMembers, patchMemberRole, postInvite } from '../../src/app/api/admin';
import { listInbox, postTriage } from '../../src/app/api/inbox';
import { ApiError } from '../../src/app/api/client';
import { setRoles } from '../../src/app/mocks/db';
import { dayRangeToInstants } from '../../src/app/model/admin';
import { removalBlocked, roleChangeBlocked } from '../../src/app/model/members';
import { auditCodec, inboxCodec } from '../../src/app/url/b2bState';
import { AdminConsole } from '../../src/examples/AdminConsole';
import { InboxPage } from '../../src/examples/InboxPage';
import { renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const everything = { actor: '', actions: [], from: '', to: '', page: 1, pageSize: 100 } as const;

describe('date ranges become instants in the reader’s time zone', () => {
  it('covers whole local days, end exclusive', () => {
    expect(dayRangeToInstants({ start: '2026-09-01', end: '2026-09-25' }, 'UTC')).toEqual({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-26T00:00:00.000Z' });
    expect(dayRangeToInstants({ start: '2026-09-01', end: '2026-09-25' }, 'America/Los_Angeles')).toEqual({ from: '2026-09-01T07:00:00.000Z', to: '2026-09-26T07:00:00.000Z' });
    expect(dayRangeToInstants({ start: '2026-09-01', end: '2026-09-25' }, 'Asia/Tokyo')).toEqual({ from: '2026-08-31T15:00:00.000Z', to: '2026-09-25T15:00:00.000Z' });
  });

  it('lands right across a daylight-saving change', () => {
    // Los Angeles leaves daylight time on 1 November 2026: that day is 25 hours long.
    expect(dayRangeToInstants({ start: '2026-10-31', end: '2026-11-01' }, 'America/Los_Angeles')).toEqual({ from: '2026-10-31T07:00:00.000Z', to: '2026-11-02T08:00:00.000Z' });
  });
});

describe('URL state', () => {
  it('falls back on anything unknown', () => {
    expect(inboxCodec.parse('?view=spam&item=acme-i001')).toEqual({ view: 'inbox', item: 'acme-i001' });
    expect(auditCodec.parse('?action=member.removed,nope&from=2026-09-25&to=2026-09-01&page=0')).toEqual({ actor: '', actions: ['member.removed'], from: '', to: '', page: 1 });
    expect(auditCodec.serialise({ actor: 'acme-p02', actions: ['member.removed', 'record.archived'], from: '2026-09-01', to: '2026-09-25', page: 2 })).toBe(
      'actor=acme-p02&action=member.removed,record.archived&from=2026-09-01&to=2026-09-25&page=2',
    );
  });
});

describe('member rules, shared by the page, the mutation and the server', () => {
  const member = (id: string, role: 'admin' | 'editor', isYou = false) => ({ id, role, status: 'active' as const, isYou });
  it('protects your own role and the last admin', () => {
    const members = [member('a', 'admin', true), member('b', 'admin'), member('c', 'editor')];
    expect(roleChangeBlocked(members[0] as never, members)).toMatch(/your own role/);
    expect(roleChangeBlocked(members[1] as never, members, 'viewer')).toBeUndefined();
    const onlyAdmin = [member('b', 'admin'), member('c', 'editor')];
    expect(roleChangeBlocked(onlyAdmin[0] as never, onlyAdmin, 'editor')).toMatch(/only admin/);
    expect(removalBlocked(onlyAdmin[0] as never, onlyAdmin)).toMatch(/only admin/);
    expect(removalBlocked(onlyAdmin[1] as never, onlyAdmin)).toBeUndefined();
  });
});

describe('the mock API: tenant- and permission-aware', () => {
  it('leaves inbox items about drafts out for a viewer, as it leaves out the drafts', async () => {
    const admin = await listInbox('acme', 'inbox');
    setRoles('viewer');
    const viewer = await listInbox('acme', 'inbox');
    expect(viewer.items.length).toBeLessThan(admin.items.length);
    expect(viewer.counts.inbox).toBe(viewer.items.length);
    expect((await listInbox('globex', 'inbox')).items.every((i) => i.id.startsWith('globex-'))).toBe(true);
  });

  it('triages one or many with one verb, and counts follow', async () => {
    const before = await listInbox('acme', 'inbox');
    const ids = before.items.slice(0, 2).map((i) => i.id);
    await postTriage('acme', ids, 'archive');
    const after = await listInbox('acme', 'inbox');
    expect(after.counts.inbox).toBe(before.counts.inbox - 2);
    expect(after.counts.archived).toBe(before.counts.archived + 2);
    expect(after.items.some((i) => ids.includes(i.id))).toBe(false);
  });

  it('shows everyone the members, lets only admins change them, and logs denied attempts', async () => {
    setRoles('editor');
    expect((await listMembers('acme')).items.length).toBeGreaterThan(0);
    await expect(postInvite('acme', { email: 'new@example.com', role: 'viewer' })).rejects.toMatchObject({ status: 403 });
    await expect(listAudit('acme', everything)).rejects.toMatchObject({ status: 403 });
    setRoles('admin');
    const log = await listAudit('acme', everything);
    expect(log.items[0]).toMatchObject({ action: 'member.invited', outcome: 'denied', actor: { label: 'Sam Rivera' } });
  });

  it('emits an audit event from every member write, with what changed', async () => {
    const members = (await listMembers('acme')).items;
    const target = members.find((m) => m.role === 'viewer' && m.status === 'active');
    if (!target) throw new Error('seed has no viewer');
    await patchMemberRole('acme', target.id, 'editor', target.version);
    const [latest] = (await listAudit('acme', everything)).items;
    expect(latest).toMatchObject({ action: 'member.role_changed', outcome: 'success', changes: [{ field: 'role', before: 'viewer', after: 'editor' }] });
    // A stale version is refused.
    await expect(patchMemberRole('acme', target.id, 'admin', target.version)).rejects.toMatchObject({ status: 409 });
  });

  it('refuses your own role on the server too', async () => {
    const me = (await listMembers('acme')).items.find((m) => m.isYou);
    if (!me) throw new Error('no own membership');
    const refused = await patchMemberRole('acme', me.id, 'viewer', me.version).catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).status).toBe(409);
  });

  it('filters the log by actor, event and instants, and exports every match as CSV', async () => {
    const all = await listAudit('acme', everything);
    const actor = all.items.find((e) => e.actor.type === 'person')?.actor.id ?? '';
    const filtered = await listAudit('acme', { ...everything, actor, actions: ['record.archived', 'record.renamed'], from: '2026-09-01T00:00:00Z', to: '2026-09-26T00:00:00Z' });
    expect(filtered.items.every((e) => e.actor.id === actor && ['record.archived', 'record.renamed'].includes(e.action) && e.at >= '2026-09-01')).toBe(true);
    const csv = await getAuditExport('acme', { actor, actions: [], from: '', to: '' });
    const lines = csv.content.split('\n');
    expect(lines[0]).toBe('id,time_utc,actor_type,actor,action,target_type,target,outcome,ip,changes');
    expect(lines.length - 1).toBe((await listAudit('acme', { ...everything, actor })).total);
  });
});

describe('Inbox: keyboard triage', () => {
  it('moves with j and k, archives with e and opens the next, all through the URL', async () => {
    const { history } = renderWithApp(<InboxPage />, { url: '/inbox' });
    await waitFor(() => expect(document.querySelector('[id^="inbox-row-"]')).not.toBeNull());
    act(() => void fireEvent.keyDown(document.body, { key: 'j' }));
    const first = new URLSearchParams(history.location().search).get('item');
    expect(first).toMatch(/^acme-i/);
    act(() => void fireEvent.keyDown(document.body, { key: 'j' }));
    const second = new URLSearchParams(history.location().search).get('item');
    expect(second).not.toBe(first);
    act(() => void fireEvent.keyDown(document.body, { key: 'k' }));
    expect(new URLSearchParams(history.location().search).get('item')).toBe(first);
    act(() => void fireEvent.keyDown(document.body, { key: 'e' }));
    // Optimistic: gone from the list at once, and the next conversation is open.
    await waitFor(() => expect(document.getElementById(`inbox-row-${first ?? ''}`)).toBeNull());
    expect(new URLSearchParams(history.location().search).get('item')).toBe(second);
  });

  it('never fires while typing in a field', async () => {
    const { history } = renderWithApp(
      <>
        <input aria-label="Notes" />
        <InboxPage />
      </>,
      { url: '/inbox' },
    );
    await waitFor(() => expect(document.querySelector('[id^="inbox-row-"]')).not.toBeNull());
    const input = screen.getByRole('textbox', { name: 'Notes' });
    fireEvent.keyDown(input, { key: 'j' });
    expect(history.location().search).toBe('');
  });
});

describe('Admin console: members', () => {
  it('disables Invite with the reason for an editor, and shows no row actions', async () => {
    renderWithApp(<AdminConsole section="members" />, { role: 'editor' });
    const invite = await screen.findByRole('button', { name: 'Invite member' });
    expect(invite.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Only workspace admins can invite, change or remove members.')).toBeTruthy();
    await screen.findByRole('table', { name: 'Members' });
    expect(screen.queryAllByRole('button', { name: /^Actions for / })).toEqual([]);
    expect(screen.queryByRole('link', { name: 'Audit log' })).toBeNull();
  });

  it('lets an admin invite; the member shows as invited', async () => {
    renderWithApp(<AdminConsole section="members" initialDialog={{ kind: 'invite' }} />);
    const dialog = await screen.findByRole('dialog', { name: 'Invite a member' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Email' }), { target: { value: 'ada@example.com' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    const table = await screen.findByRole('table', { name: 'Members' });
    await waitFor(() => expect(within(table).getAllByText('ada@example.com').length).toBeGreaterThan(0));
  });
});
