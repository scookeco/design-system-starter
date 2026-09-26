import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import { Feedback } from '../Feedback/Feedback';
import { Message } from '../Message/Message';
import { StreamingText } from '../StreamingText/StreamingText';
import { ChatThread } from './ChatThread';

const turns = [
  <Message key="1" role="user" author="Sam Rivera" time="2026-09-14T10:04:00Z" copyText="When does this renew?">
    When does this renew?
  </Message>,
  <Message key="2" role="assistant" author="Assistant" time="2026-09-14T10:04:05Z" copyText="It renews on 15 January 2027." onRetry={() => undefined} feedback={<Feedback onFeedback={() => undefined} />}>
    <StreamingText text="It renews on **15 January 2027**, unless either side gives sixty days’ notice." />
  </Message>,
  <Message key="3" role="user" author="Sam Rivera" time="2026-09-14T10:05:00Z">
    Who owns it?
  </Message>,
];

const meta = {
  title: 'Components/ChatThread',
  component: ChatThread,
  args: { label: 'Conversation about Master cleaning agreement' },
} satisfies Meta<typeof ChatThread>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Conversation: Story = { args: { children: turns } };
export const Streaming: Story = {
  args: {
    children: [
      ...turns,
      <Message key="4" role="assistant" author="Assistant" status="streaming">
        <StreamingText text="Sam Rivera owns it. They took it" status="streaming" />
      </Message>,
    ],
  },
};
/** No turns yet: suggested prompts, not a blank box. */
export const Empty: Story = {
  args: {
    empty: (
      <EmptyState
        reason="first-use"
        title="Ask about this record"
        description="Answers cite the record’s fields and activity."
        action={<Button variant="secondary">When does it renew?</Button>}
      />
    ),
  },
};
