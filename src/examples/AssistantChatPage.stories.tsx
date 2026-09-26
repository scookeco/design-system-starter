import type { Meta, StoryObj } from '@storybook/react-vite';
import { aiContentFiltered, aiHoldAfter, aiNetworkDropped, aiNoHistory, aiRateLimited } from '../app/mocks/ai';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { AssistantChatPage } from './AssistantChatPage';

const meta = {
  title: 'Examples/Assistant chat',
  component: AssistantChatPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
  parameters: { ...mockApiMeta.parameters, ...mockApi({ url: '/assistant' }) },
} satisfies Meta<typeof AssistantChatPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const inConversation = mockApi({ url: '/assistant?c=c-3' });

/** A conversation from history, open: its answer cites the list it counted. */
export const WithHistory: Story = { parameters: inConversation };
/** A new chat: suggested questions beside the history. */
export const NewChat: Story = {};
/** Nobody has asked anything yet. */
export const EmptyHistory: Story = { parameters: mswOverrides(aiNoHistory) };
/** The history is loading. */
export const LoadingHistory: Story = { tags: ['busy'], parameters: mswOverrides(hold('get', '/ai/conversations')) };
/** Tool activity and a citation: the answer says it counted, and links to the list. */
export const ToolActivity: Story = { args: { initialPrompt: 'How many records are overdue?' } };
/** Mid-answer, pinned: the caret, and Stop in the composer. */
export const Streaming: Story = { tags: ['busy'], args: { initialPrompt: 'What can you help with?' }, parameters: mswOverrides(aiHoldAfter(8)) };
/** Stopped: what arrived stays, with Retry. */
export const Stopped: Story = { args: { initialPrompt: 'What can you help with?', initialStopAfter: 8 }, parameters: mswOverrides(aiHoldAfter(8)) };
/** Outside its scope: a one-line refusal instead of a guess. */
export const Refusal: Story = { args: { initialPrompt: 'Tell me a joke about invoices' } };
/** Another workspace is out of reach, even for someone who belongs to both. */
export const OtherWorkspace: Story = { args: { initialPrompt: 'How many records does Globex have?' } };
export const RateLimited: Story = { args: { initialPrompt: 'How many records are overdue?' }, parameters: mswOverrides(aiRateLimited) };
export const ContentFiltered: Story = { args: { initialPrompt: 'What can you help with?' }, parameters: mswOverrides(aiContentFiltered) };
export const ConnectionDropped: Story = { args: { initialPrompt: 'What can you help with?' }, parameters: mswOverrides(aiNetworkDropped) };
/** A link to a conversation that was deleted. */
export const ConversationGone: Story = { parameters: { ...inConversation, ...mswOverrides(fail('get', '/ai/conversations/:id', 404, 'not_found', 'This conversation doesn’t exist, or was deleted.')) } };
export const RenameDialog: Story = { tags: ['modal-open', '!autodocs'], args: { initialDialog: 'rename' }, parameters: inConversation };
export const DeleteDialog: Story = { tags: ['modal-open', '!autodocs'], args: { initialDialog: 'delete' }, parameters: inConversation };
