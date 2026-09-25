import { Button, Cluster, Toggle, Tooltip } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Toggle],
  whenToUse: [
    'A button that stays on: a view option or mode that applies immediately (Show archived, Bold, Preview).',
    'Icon only (`hideLabel` with an `icon`) in a dense toolbar, wrapped in a `Tooltip` that shows the same label.',
  ],
  whenNotToUse: [
    { situation: 'A setting saved to the account', instead: '`Switch`' },
    { situation: 'One of several options', instead: '`SegmentedControl`' },
    { situation: 'An action that happens once', instead: '`Button`' },
  ],
  do: {
    caption: 'The label names what it turns on and never changes; pressed shows in fill, border and weight.',
    render: () => (
      <Cluster gap="sm">
        <Toggle label="Show archived" defaultPressed />
        <Tooltip content="Compact rows">
          <Toggle label="Compact rows" icon="menu" hideLabel />
        </Tooltip>
      </Cluster>
    ),
  },
  dont: {
    caption: 'A plain button that swaps its label between “Show archived” and “Hide archived”: the state is only in the words, and the name keeps changing.',
    render: () => (
      <Button variant="secondary" size="sm">
        Hide archived
      </Button>
    ),
  },
  accessibility: [
    'A button with `aria-pressed`; Space and Enter toggle it. The label is the accessible name and stays constant.',
    'At least `size.control-sm` (32px), above the 24px target minimum.',
  ],
};
