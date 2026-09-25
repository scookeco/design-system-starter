import { Badge, Cluster } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Badge],
  whenToUse: [
    'A record’s status in a table row, title or card: a word plus a tone.',
    'Map domain statuses to tones in one place (the examples keep one status-to-tone map); a new status extends the map.',
  ],
  whenNotToUse: [
    { situation: 'A message that needs a sentence or an action', instead: '`Banner`' },
    { situation: 'A count or a filter chip', instead: 'text, or a proposal for a new component' },
  ],
  do: {
    caption: 'One short word per status, the same word everywhere it appears.',
    render: () => (
      <Cluster gap="xs">
        <Badge tone="success">Approved</Badge>
        <Badge tone="warning">Pending</Badge>
        <Badge tone="neutral">Draft</Badge>
      </Cluster>
    ),
  },
  dont: {
    caption: 'Sentences in badges, and a danger tone for something that isn’t a problem.',
    render: () => (
      <Cluster gap="xs">
        <Badge tone="danger">New feature available now</Badge>
      </Cluster>
    ),
  },
  accessibility: [
    'Text is required: status is never colour alone, and tones add an icon or dot as a second cue.',
    'Tone text meets 4.5:1 on its background in light and dark.',
  ],
};
