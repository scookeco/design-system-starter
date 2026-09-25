import { Button, Cluster, SegmentedControl } from '../../src/index';
import type { UsageDoc } from './types';

const ranges = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export const usage: UsageDoc = {
  covers: [SegmentedControl],
  whenToUse: [
    'Choosing one of two to five short options that change what the page shows, where one is always chosen: a date range, a density, list or board.',
    'It is a radio group underneath (a named radiogroup of radios), because exactly one value is always selected and it can’t be cleared. Tab reaches the checked option; arrow keys move and select at once.',
  ],
  whenNotToUse: [
    { situation: 'A choice inside a form that is submitted', instead: '`RadioGroup`' },
    { situation: 'More than five options, or long labels', instead: '`Select`' },
    { situation: 'Switching panels of content', instead: '`Tabs`' },
    { situation: 'Independent on/off options', instead: '`Switch` or `Checkbox`' },
  ],
  do: {
    caption: 'A named group of short, parallel options with one always selected.',
    render: () => <SegmentedControl label="Date range (do example)" options={ranges} defaultValue="30d" />,
  },
  dont: {
    caption: 'A row of buttons faking a selection: nothing tells assistive tech which one is chosen, or that they belong together.',
    render: () => (
      <Cluster gap="2xs">
        <Button variant="secondary" size="sm">
          7 days
        </Button>
        <Button size="sm">30 days</Button>
        <Button variant="secondary" size="sm">
          90 days
        </Button>
      </Cluster>
    ),
  },
  accessibility: [
    '`label` is required and names the group; `hideLabel` hides it visually only.',
    'The checked segment is raised, outlined and heavier, not just a different colour.',
    'Arrow keys select as they move (selection follows focus), so each move updates the page: keep the update fast and don’t move focus.',
  ],
};
