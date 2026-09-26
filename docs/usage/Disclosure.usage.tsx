import { Badge, Disclosure, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Disclosure],
  whenToUse: [
    'One section of details people sometimes want: an assistant’s tool activity (what it searched, what it found), its reasoning, an advanced option.',
    'Closed by default; the summary says what’s inside (“Searched 12 records”), with a status in `meta`.',
  ],
  whenNotToUse: [
    { situation: 'Several related sections, one open at a time', instead: '`Accordion`' },
    { situation: 'Panels the person switches between', instead: '`Tabs`' },
    { situation: 'Content everyone needs', instead: 'show it; don’t hide it behind a toggle' },
  ],
  do: {
    caption: 'The summary says what happened; the details are one click away.',
    render: () => (
      <Disclosure summary="Searched records matching “overdue”" meta={<Badge tone="success">Done</Badge>}>
        <Text>12 records matched. 2 are archived and were left out.</Text>
      </Disclosure>
    ),
  },
  dont: {
    caption: 'A vague summary: nobody knows whether it’s worth opening.',
    render: () => (
      <Disclosure summary="Details">
        <Text>12 records matched.</Text>
      </Disclosure>
    ),
  },
  accessibility: [
    'The toggle is a button with `aria-expanded` and `aria-controls` (Radix Collapsible); Enter and Space toggle it.',
    'Content that opens is in the reading order right after the toggle, so nothing is lost when it opens.',
  ],
};
