import { Button, ChatThread, EmptyState, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [ChatThread],
  whenToUse: [
    'The scrolling list of turns in a conversation with an assistant: in an `AssistantPanel` beside the page, or a full chat page.',
    'Give it the space to fill (a flex column); it follows new output while the person is at the bottom and offers “Jump to latest” when they scroll up.',
    'Pass suggested prompts as `empty`, never a blank box.',
    'On a full chat page set `scroll="page"`: the thread grows, AppShell’s main scrolls (the Composer goes in AppShell’s `footer`), and it follows the output there.',
  ],
  whenNotToUse: [
    { situation: 'A record’s comments or activity', instead: '`Timeline`' },
    { situation: 'Notifications', instead: '`Toast` or an inbox list' },
  ],
  do: {
    caption: 'An empty thread offers prompts to start from.',
    render: () => (
      <ChatThread
        label="Conversation"
        empty={<EmptyState reason="first-use" title="Ask about this record" description="Answers cite its fields and activity." action={<Button variant="secondary">When does it renew?</Button>} />}
      />
    ),
  },
  dont: {
    caption: 'Turns stacked as paragraphs: no roles, no authors, nothing to navigate by.',
    render: () => (
      <div>
        <Text>When does it renew?</Text>
        <Text>15 January 2027.</Text>
      </div>
    ),
  },
  accessibility: [
    'The thread is a named, focusable region (`label`), so it scrolls from the keyboard; turns are a list.',
    'It is deliberately not a live region (`role="log"` would read every token): each answer’s `StreamingText` announces complete sentences instead.',
    'Scrolling keeps focus clear of “Jump to latest” (`space.scroll-padding.end`).',
  ],
};
