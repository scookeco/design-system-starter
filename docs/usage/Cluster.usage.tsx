import { Badge, Button, Cluster, Heading } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Cluster],
  whenToUse: [
    'A row that may wrap: buttons, filters, tags.',
    '`justify="between"` for a two-zone bar: title on the start side, actions on the end.',
  ],
  whenNotToUse: [
    { situation: 'Items that must line up in columns across rows', instead: '`Grid` or `Table`' },
    { situation: 'Two regions of different weight, such as content and a rail', instead: '`Sidebar`' },
  ],
  do: {
    caption: 'A header bar: the title and its status on one side, the action on the other, wrapping on narrow screens.',
    render: () => (
      <Cluster justify="between">
        <Cluster gap="xs">
          <Heading level={4}>Hardware lease</Heading>
          <Badge tone="success">Approved</Badge>
        </Cluster>
        <Button variant="secondary">Edit</Button>
      </Cluster>
    ),
  },
  dont: {
    caption: 'Wrapping turned off for a long row: it overflows instead of reflowing.',
    render: () => (
      <Cluster wrap={false} gap="xs">
        <Button variant="secondary" size="sm">Status</Button>
        <Button variant="secondary" size="sm">Owner</Button>
        <Button variant="secondary" size="sm">Created</Button>
        <Button variant="secondary" size="sm">Amount</Button>
      </Cluster>
    ),
  },
  accessibility: [
    'Layout only. DOM order is visual order, including after wrapping.',
    'For a list of items (tags, filters), render it as a list with `as="ul"`.',
  ],
};
