import { Divider, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Divider],
  whenToUse: [
    'A boundary that space alone doesn’t make clear: between a form and its danger zone, between groups of toolbar controls.',
    '`decorative` (the default) hides it from assistive technology. Set `decorative={false}` only when it divides groups people navigate between; it becomes a `separator`.',
  ],
  whenNotToUse: [
    { situation: 'Separating every item in a list or form', instead: 'the gap of a `Stack`, and headings for sections' },
    { situation: 'Framing a group', instead: '`Card`' },
  ],
  do: {
    caption: 'One line where the content changes kind.',
    render: () => (
      <Stack gap="md">
        <Text>Billing contact and invoices.</Text>
        <Divider />
        <Text>Danger zone: delete this workspace.</Text>
      </Stack>
    ),
  },
  dont: {
    caption: 'A line between every paragraph: the page turns into stripes and nothing stands out.',
    render: () => (
      <Stack gap="xs">
        <Text>Name</Text>
        <Divider />
        <Text>Email</Text>
        <Divider />
        <Text>Phone</Text>
      </Stack>
    ),
  },
  accessibility: ['Decorative dividers are hidden; semantic ones are `role="separator"` with their orientation. From Radix Separator.'],
};
