import { AiMarker, Cluster, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [AiMarker],
  whenToUse: [
    'Content the AI wrote that a person hasn’t accepted or edited yet: a drafted field, a generated summary, a proposed change.',
    '`badge` beside a block or field; `inline` in a header or a line of text (an assistant turn’s header).',
  ],
  whenNotToUse: [
    { situation: 'Content a person accepted or edited', instead: 'nothing: remove the mark, or record “edited” in the content’s history' },
    { situation: 'A button that runs an AI action', instead: 'a `Button` with the sparkle and a verb (“Suggest description”)' },
    { situation: 'A status', instead: '`Badge`' },
  ],
  do: {
    caption: 'The label says what the AI did; the tint and sparkle only reinforce it.',
    render: () => (
      <Cluster gap="sm">
        <Text as="span">Summary</Text>
        <AiMarker>Drafted with AI</AiMarker>
      </Cluster>
    ),
  },
  dont: {
    caption: 'A sparkle alone: colour and an icon aren’t a label, and it reads as decoration.',
    render: () => (
      <Cluster gap="sm">
        <Text as="span">Summary ✦</Text>
      </Cluster>
    ),
  },
  accessibility: [
    'The text is the meaning (WCAG 1.4.1): it is read with the content, and the tint only reinforces it. The sparkle icon is hidden from assistive technology.',
    'Keep the label short and specific; it is read every time the content is.',
  ],
};
