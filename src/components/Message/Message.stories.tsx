import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge/Badge';
import { Disclosure } from '../Disclosure/Disclosure';
import { Feedback } from '../Feedback/Feedback';
import { StreamingText } from '../StreamingText/StreamingText';
import { Message } from './Message';

const TIME = '2026-09-14T10:04:00Z';
const ANSWER = 'It renews on **15 January 2027**, unless either side gives sixty days’ notice.';

const meta = {
  title: 'Components/Message',
  component: Message,
  args: { role: 'assistant', author: 'Assistant', time: TIME, children: <StreamingText text={ANSWER} /> },
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

export const User: Story = { args: { role: 'user', author: 'Sam Rivera', children: 'When does this renew?', copyText: 'When does this renew?', onEdit: () => undefined } };
export const Assistant: Story = {
  args: { copyText: ANSWER, onRetry: () => undefined, feedback: <Feedback onFeedback={() => undefined} /> },
};
/** While it streams there are no actions: they arrive with the finished answer. */
export const AssistantStreaming: Story = {
  args: { status: 'streaming', time: undefined, children: <StreamingText text={ANSWER.slice(0, 30)} status="streaming" />, copyText: ANSWER, onRetry: () => undefined },
};
export const AssistantPending: Story = { args: { status: 'pending', time: undefined, children: <StreamingText text="" status="pending" /> } };
export const AssistantStopped: Story = {
  args: { status: 'stopped', children: <StreamingText text={ANSWER.slice(0, 30)} status="stopped" />, copyText: ANSWER.slice(0, 30), onRetry: () => undefined },
};
export const AssistantError: Story = {
  args: { status: 'error', children: <StreamingText text="" status="error" />, error: 'The connection dropped before the answer finished. Nothing was changed.', onRetry: () => undefined },
};
/** A tool the assistant ran, with its input and output one click away. */
export const Tool: Story = {
  args: {
    role: 'tool',
    author: 'Search records',
    children: (
      <Disclosure summary="Searched records matching “overdue”" meta={<Badge tone="success">Done</Badge>}>
        12 records matched in Acme. 2 are archived and were left out.
      </Disclosure>
    ),
  },
};
export const System: Story = { args: { role: 'system', author: 'System', children: 'You stopped the answer.' } };
