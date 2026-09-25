import { Center, EmptyState, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Center],
  whenToUse: [
    'The page column inside AppShell’s main: a bounded measure (`max`) with gutters.',
    '`intrinsic` to centre short content such as an empty state.',
  ],
  whenNotToUse: [
    { situation: 'Centring one control in a row', instead: '`Cluster` with `justify="center"`' },
    { situation: 'A full-bleed work surface', instead: 'the page content directly in main' },
  ],
  do: {
    caption: 'A readable measure for running text.',
    render: () => (
      <Center max="sm" gutters="sm">
        <Text>Records track agreements from draft to renewal, with their owner, amount and every change along the way.</Text>
      </Center>
    ),
  },
  dont: {
    caption: 'An intrinsic centre around a long paragraph: centred text is hard to read.',
    render: () => (
      <Center intrinsic>
        <EmptyState
          reason="first-use"
          headingLevel={4}
          title="About records"
          description="Records track agreements from draft to renewal, with their owner, amount and every change along the way, and can be exported."
        />
      </Center>
    ),
  },
  accessibility: ['Layout only. Pass `as="main"` or `as="article"` only when that landmark isn’t already provided (AppShell provides main).'],
};
