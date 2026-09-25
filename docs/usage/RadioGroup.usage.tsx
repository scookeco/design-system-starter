import { RadioGroup } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [RadioGroup],
  whenToUse: [
    'Choosing exactly one of two to about five options that are worth seeing side by side.',
    'Add a `description` to options whose consequences differ.',
  ],
  whenNotToUse: [
    { situation: 'Many options', instead: '`Select`' },
    { situation: 'A single yes/no', instead: '`Checkbox` (in a form) or `Switch` (applies at once)' },
  ],
  do: {
    caption: 'The group label asks the question; each option says what it means.',
    render: () => (
      <RadioGroup
        label="Billing period"
        defaultValue="yearly"
        options={[
          { value: 'monthly', label: 'Monthly', description: 'Cancel any time.' },
          { value: 'yearly', label: 'Yearly', description: 'Two months free.' },
        ]}
      />
    ),
  },
  dont: {
    caption: 'Radio buttons for a long list: the form becomes a wall of options. Use a Select.',
    render: () => (
      <RadioGroup
        label="Country"
        orientation="horizontal"
        options={['Austria', 'Belgium', 'Denmark', 'Finland', 'France', 'Germany', 'Ireland', 'Italy'].map((c) => ({ value: c, label: c }))}
      />
    ),
  },
  accessibility: [
    'Renders a labelled `radiogroup`; arrow keys move between options.',
    'A group `error` sets `aria-invalid` on the group; pass `id` so an error summary can link to the first option.',
  ],
};
