import { Feedback, Message, StreamingText, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Message],
  whenToUse: [
    'One turn inside a `ChatThread`: `user` (tinted, at the inline end), `assistant` (full width, AI-marked), `tool` (what the assistant ran, usually a `Disclosure`) or `system` (a note such as “You stopped the answer”).',
    'Actions appear once a turn has finished: Copy (`copyText`), Retry, Edit (user turns) and a `Feedback` control.',
  ],
  whenNotToUse: [
    { situation: 'Comments on a record', instead: 'the record page’s activity list (`Timeline` or the activity feed)' },
    { situation: 'A one-off AI result inside a form', instead: '`Suggestion`, or the content with an `AiMarker`' },
  ],
  do: {
    caption: 'An assistant turn: who, when, the AI mark, the answer, then its actions.',
    render: () => (
      <Message role="assistant" author="Assistant" time="2026-09-14T10:04:05Z" copyText="It renews on 15 January 2027." onRetry={() => undefined} feedback={<Feedback onFeedback={() => undefined} />}>
        <StreamingText text="It renews on **15 January 2027**." />
      </Message>
    ),
  },
  dont: {
    caption: 'An answer as plain text with no author, time, mark or actions: it can’t be checked, copied or retried.',
    render: () => <Text>It renews on 15 January 2027.</Text>,
  },
  accessibility: [
    'Each turn is an `article` named by its author, so screen-reader users can move turn by turn.',
    'An error shows as text with an icon (`role="alert"`) and a Retry; never colour alone.',
    'The assistant avatar is decorative; the author name and the AI marker carry the meaning.',
  ],
};
