import { Avatar, Cluster, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Avatar],
  whenToUse: ['Showing who: record owners, activity authors, the signed-in user in the account menu trigger.'],
  whenNotToUse: [
    { situation: 'Representing a company, product or file', instead: 'an icon or plain text' },
    { situation: 'The only place a person’s name appears in a list', instead: 'the name as text, with the avatar beside it' },
  ],
  do: {
    caption: 'Beside the visible name, the avatar is `decorative`, so the name isn’t read twice.',
    render: () => (
      <Cluster gap="xs">
        <Avatar name="Sam Rivera" size="sm" decorative />
        <Text as="span">Sam Rivera</Text>
      </Cluster>
    ),
  },
  dont: {
    caption: 'A row of initials with no names: people have to hover to find out who is who.',
    render: () => (
      <Cluster gap="2xs">
        <Avatar name="Sam Rivera" size="sm" />
        <Avatar name="Alex Kim" size="sm" />
        <Avatar name="Jo Park" size="sm" />
      </Cluster>
    ),
  },
  accessibility: [
    '`name` is required: it is the accessible name and the source of the initials fallback.',
    'Set `decorative` when the name is already visible next to it.',
  ],
};
