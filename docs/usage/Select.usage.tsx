import { Select } from '../../src/index';
import type { UsageDoc } from './types';

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'expired', label: 'Expired' },
];

export const usage: UsageDoc = {
  covers: [Select],
  whenToUse: ['Choosing one option from a list of about five or more, where showing them all would crowd the form.'],
  whenNotToUse: [
    { situation: 'Two to four options that benefit from being compared', instead: '`RadioGroup`' },
    { situation: 'On or off', instead: '`Switch` or `Checkbox`' },
    { situation: 'Running an action', instead: '`Menu`' },
  ],
  do: {
    caption: 'Many options, a clear label, and a sensible default.',
    render: () => <Select label="Status" options={STATUSES} defaultValue="draft" />,
  },
  dont: {
    caption: 'Two options hidden behind a click. Radio buttons show both at once.',
    render: () => (
      <Select
        label="Billing"
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly' },
        ]}
        placeholder="Choose"
      />
    ),
  },
  accessibility: [
    'Keyboard, typeahead and focus return come from Radix; the trigger’s accessible name is the `label`.',
    'A hidden native select carries the value, so `name` works inside a form.',
  ],
};
