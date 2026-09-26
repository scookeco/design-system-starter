import { Checkbox, MultiSelect, Stack } from '../../src/index';
import type { UsageDoc } from './types';

const EVENTS = [
  { value: 'member.invited', label: 'Member invited' },
  { value: 'member.role_changed', label: 'Role changed' },
  { value: 'member.removed', label: 'Member removed' },
  { value: 'record.archived', label: 'Record archived' },
];

export const usage: UsageDoc = {
  covers: [MultiSelect],
  whenToUse: ['Choosing several values from a longer list: event types in a filter, tags, teams.', 'When the chosen values should stay visible (as chips) while more are added.'],
  whenNotToUse: [
    { situation: 'A handful of options that fit on screen', instead: 'a group of `Checkbox`es' },
    { situation: 'One value', instead: '`Combobox` or `Select`' },
  ],
  do: {
    caption: 'Chosen values as chips, each with its own remove button; the list narrows as you type.',
    render: () => <MultiSelect label="Events" options={EVENTS} defaultValue={['member.role_changed']} />,
  },
  dont: {
    caption: 'Two independent yes/no settings squeezed into a multi-select: checkboxes are clearer.',
    render: () => (
      <Stack gap="xs">
        <Checkbox label="Email me" />
        <Checkbox label="Notify me in the app" />
      </Stack>
    ),
  },
  accessibility: [
    'React Aria’s combobox in multiple-selection mode: options announce whether they’re selected, and the list stays open while you choose.',
    'Each chip’s remove button is named after its value (`removeLabel`); removing one returns focus to the input.',
    'The field wraps onto more lines rather than hiding chosen values behind a count.',
  ],
};
