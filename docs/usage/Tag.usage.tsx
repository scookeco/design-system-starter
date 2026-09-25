import { Badge, Cluster, Tag } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Tag],
  whenToUse: [
    'Active filters above a list, each removable: “Status: Overdue”.',
    'Labels on a record that people add and remove.',
    'After a removal, move focus to the next tag, or to the control that adds them (a Filters button) when none are left, as the List page example does with `removeRef`.',
  ],
  whenNotToUse: [
    { situation: 'A status', instead: '`Badge`, mapped from the domain status' },
    { situation: 'An action', instead: '`Button`' },
  ],
  do: {
    caption: 'Filter chips that say what they filter, each with a named remove button.',
    render: () => (
      <Cluster gap="xs">
        <Tag onRemove={() => undefined}>Status: Active</Tag>
        <Tag onRemove={() => undefined}>Status: Pending</Tag>
      </Cluster>
    ),
  },
  dont: {
    caption: 'A status badge used as a filter chip: it looks like data about a record, and it can’t be removed.',
    render: () => <Badge tone="success">Active</Badge>,
  },
  accessibility: [
    'The remove button is named “Remove <label>” by default (override with `removeLabel`) and is at least the minimum target size.',
    'The tag itself isn’t interactive; only its remove button is.',
    'Put a group of tags in a list with a name (“Active filters”).',
  ],
};
