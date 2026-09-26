import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { fail } from '../app/mocks/overrides';
import { AdminConsole } from './AdminConsole';
import { ExampleApp } from './App';

const meta = {
  title: 'Examples/Admin console',
  component: AdminConsole,
  tags: ['!autodocs', 'data'],
  args: { section: 'members' },
  ...mockApiMeta,
} satisfies Meta<typeof AdminConsole>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Members: role, status and last activity; an admin's row actions (none on your own row or the only admin's). */
export const Members: Story = {};
/** An editor sees who's in the workspace, but Invite is disabled with the reason and no row has actions. */
export const MembersAsEditor: Story = { parameters: mockApi({ role: 'editor' }) };
export const InviteDialog: Story = { tags: ['modal-open'], args: { initialDialog: { kind: 'invite' } } };
/** Changing a role is reviewed first: from → to, and exactly which capabilities it adds. */
export const ChangeRoleReview: Story = { tags: ['modal-open'], args: { initialDialog: { kind: 'role', memberId: 'acme-m04', role: 'admin' } } };
export const RemoveConfirm: Story = { tags: ['modal-open'], args: { initialDialog: { kind: 'remove', memberId: 'acme-m05' } } };
export const MembersLoadError: Story = { parameters: mswOverrides(fail('get', '/members')) };
/** The audit log, newest first: time in the reader's zone, actor and IP, event, target, outcome. */
export const AuditLog: Story = { args: { section: 'audit' } };
/** Filtered (all in the URL): one actor, two events, a date range turned into instants in the reader's time zone. */
export const AuditFiltered: Story = {
  args: { section: 'audit' },
  parameters: mockApi({ url: '/admin/audit?actor=acme-p02&action=member.role_changed,record.archived,record.renamed&from=2026-08-20&to=2026-09-25' }),
};
/** A row expanded to its full payload: ids, IP and what changed. */
export const AuditRowExpanded: Story = { args: { section: 'audit', initialExpanded: ['acme-e0140', 'acme-e0139'] } };
export const AuditNoResults: Story = { args: { section: 'audit' }, parameters: mockApi({ url: '/admin/audit?actor=system&action=api_key.revoked' }) };
/** An editor opening the audit log's URL: the route guard's 403 page, from the same `can`. */
export const AuditForbidden: Story = { tags: ['!data'], render: () => <ExampleApp />, parameters: mockApi({ url: '/admin/audit', role: 'editor' }) };
