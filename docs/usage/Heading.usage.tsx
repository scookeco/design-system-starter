import { Heading, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Heading],
  whenToUse: [
    'Page titles (`level={1}`, one per page) and section titles, in outline order.',
    'When the look must differ from the outline, keep the right `level` and set `size`.',
  ],
  whenNotToUse: [
    { situation: 'Making text bigger or bolder for emphasis', instead: '`Text` with `size="body-lg"`, or `<strong>`' },
    { situation: 'A card or empty-state title', instead: 'the `title` prop of `CardHeader` or `EmptyState`, which renders the heading for you' },
  ],
  do: {
    caption: 'Levels follow the outline; the section title is visually smaller with `size`, not a skipped level.',
    render: () => (
      <Stack gap="xs">
        <Heading level={3}>Billing</Heading>
        <Heading level={4} size={4}>
          Payment method
        </Heading>
        <Text tone="muted">Visa ending 4242</Text>
      </Stack>
    ),
  },
  dont: {
    caption: 'A heading used as a label for a value: it adds noise to the outline screen-reader users navigate by.',
    render: () => (
      <Stack gap="xs">
        <Heading level={4}>Owner</Heading>
        <Text>Sam Rivera</Text>
      </Stack>
    ),
  },
  accessibility: [
    '`level` is required, so the outline is always a deliberate choice. Never skip a level to get a size.',
    'Exactly one `level={1}` per page, matching the page title and the breadcrumb’s current item.',
  ],
};
