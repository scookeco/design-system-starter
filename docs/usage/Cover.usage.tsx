import { Button, Cover, Heading, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Cover],
  whenToUse: [
    'Centring one block vertically in the space available, with an optional header and footer pinned to the edges: a sign-in card, a full-page message.',
    '`minBlockSize="viewport"` for a whole page; `"fill"` (default) inside a parent that has a block size.',
    'When the content is taller than the space, everything flows and scrolls; nothing is clipped.',
  ],
  whenNotToUse: [
    { situation: 'A signed-out page', instead: '`AuthLayout`, which composes Cover with the brand, card and footer' },
    { situation: 'Centring horizontally with a bounded measure', instead: '`Center`' },
    { situation: 'An empty list or panel', instead: '`EmptyState` in the region it replaces' },
  ],
  do: {
    caption: 'One message centred in the space, with a header pinned above it.',
    render: () => (
      <Cover header={<Text tone="muted">Acme</Text>}>
        <Stack gap="xs" align="center">
          <Heading level={4}>You’re all set</Heading>
          <Button>Go to Home</Button>
        </Stack>
      </Cover>
    ),
  },
  dont: {
    caption: 'Several unrelated blocks in one Cover: only one thing can be the centre of attention.',
    render: () => (
      <Cover>
        <Stack gap="xs">
          <Heading level={4}>Recent records</Heading>
          <Heading level={4}>Usage this month</Heading>
          <Heading level={4}>Team</Heading>
        </Stack>
      </Cover>
    ),
  },
  accessibility: [
    'Layout only: it adds no landmark. Pass landmark elements (`header`, `main`, `footer`) into its slots when it frames a whole page, as AuthLayout does.',
    'DOM order is header, content, footer, so reading order matches what is seen.',
  ],
};
