import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { DemoNarrow } from '../../.storybook/DemoBox';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { fail, hold } from '../app/mocks/overrides';
import { InboxPage } from './InboxPage';

const narrow = [
  (Story: () => React.ReactElement) => (
    <DemoNarrow>
      <Story />
    </DemoNarrow>
  ),
];

const meta = {
  title: 'Examples/Inbox',
  component: InboxPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof InboxPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The list and an empty reading pane: J opens the first conversation, K the one before. */
export const Default: Story = { parameters: mockApi({ url: '/inbox' }) };
/** A conversation open (in the URL): marked read on open; Archive, Mark unread and their keys beside it. */
export const ConversationOpen: Story = { parameters: mockApi({ url: '/inbox?item=acme-i005' }) };
/** Bulk triage: the selection's toolbar (E archives them all, U marks them read). */
export const WithSelection: Story = { args: { initialSelection: ['acme-i001', 'acme-i002', 'acme-i003'] }, parameters: mockApi({ url: '/inbox' }) };
export const Archived: Story = { parameters: mockApi({ url: '/inbox?view=archived' }) };
/** The ? overlay over the inbox: the Inbox scope lists this page's shortcuts. */
export const ShortcutsOverlay: Story = { tags: ['modal-open'], args: { initialShortcutsOpen: true }, parameters: mockApi({ url: '/inbox?item=acme-i005' }) };
/** A narrow screen: one pane, the list. */
export const NarrowList: Story = { decorators: narrow, parameters: mockApi({ url: '/inbox' }) };
/** A narrow screen with a conversation open: the detail, and All conversations to go back. */
export const NarrowConversation: Story = { decorators: narrow, parameters: mockApi({ url: '/inbox?item=acme-i005' }) };
/** A viewer: nothing about a draft reaches them (the server leaves those items out, like the drafts). */
export const AsViewer: Story = { parameters: mockApi({ url: '/inbox', role: 'viewer' }) };
export const Loading: Story = { tags: ['busy'], parameters: { ...mockApi({ url: '/inbox' }), ...mswOverrides(hold('get', '/inbox')) } };
export const LoadError: Story = { parameters: { ...mockApi({ url: '/inbox' }), ...mswOverrides(fail('get', '/inbox')) } };
export const Empty: Story = {
  parameters: {
    ...mockApi({ url: '/inbox' }),
    ...mswOverrides(http.get('*/api/t/:tenant/inbox', () => HttpResponse.json({ items: [], counts: { inbox: 0, unread: 0, archived: 0 } }))),
  },
};
