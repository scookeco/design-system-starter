import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { NotificationsPage } from './NotificationsPage';

const none = (unread = 0) => mswOverrides(http.get('*/api/t/:tenant/notifications', () => HttpResponse.json({ items: [], counts: { all: unread, unread } })));

const meta = {
  title: 'Examples/Notifications',
  component: NotificationsPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof NotificationsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Newest first; unread in bold with a badge; each row marks read on open, or by hand. */
export const Default: Story = { parameters: mockApi({ url: '/notifications' }) };
export const Unread: Story = { parameters: mockApi({ url: '/notifications?view=unread' }) };
/** One type, from the Type filter: in the URL, with replace. */
export const Mentions: Story = { parameters: mockApi({ url: '/notifications?kind=mention' }) };
/** Two arrive while the page is open: the bell and the counts move at once, the rows don't, and Show 2 new brings them in. */
export const NewWhileOpen: Story = {
  parameters: mockApi({ url: '/notifications', anotherUser: [{ kind: 'notify' }, { kind: 'notify', notification: 'assignment' }] }),
};
/** The bell's popover: the latest unread, Mark all read, and the way to this page. */
export const BellOpen: Story = { args: { initialBellOpen: true }, parameters: mockApi({ url: '/notifications' }) };
export const AllCaughtUp: Story = { parameters: { ...mockApi({ url: '/notifications?view=unread' }), ...none() } };
export const FirstUse: Story = { parameters: { ...mockApi({ url: '/notifications' }), ...none() } };
/** A viewer hears nothing about drafts: those notifications are left out, like the drafts. */
export const AsViewer: Story = { parameters: mockApi({ url: '/notifications', role: 'viewer' }) };
export const Loading: Story = { tags: ['busy'], parameters: { ...mockApi({ url: '/notifications' }), ...mswOverrides(hold('get', '/notifications')) } };
export const LoadError: Story = { parameters: { ...mockApi({ url: '/notifications' }), ...mswOverrides(fail('get', '/notifications')) } };
