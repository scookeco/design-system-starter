import { Stack, TextField } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [TextField],
  whenToUse: ['Short free text: names, emails, amounts, search.', 'Set `type` so mobile keyboards and autofill do the right thing.'],
  whenNotToUse: [
    { situation: 'More than one line of text', instead: '`Textarea`' },
    { situation: 'Picking from a known list', instead: '`Select` (many options) or `RadioGroup` (a few)' },
  ],
  do: {
    caption: 'A visible label, helper text that explains format, and an error that says how to fix it.',
    render: () => (
      <Stack gap="md">
        <TextField label="Work email" type="email" description="We send invoices here." />
        <TextField label="Amount" type="number" defaultValue="0" error="Enter an amount greater than 0." />
      </Stack>
    ),
  },
  dont: {
    caption: 'Hidden labels on a form: the placeholder vanishes as soon as someone types, and so does the question.',
    render: () => (
      <Stack gap="md">
        <TextField label="Work email" hideLabel placeholder="Work email" />
        <TextField label="Amount" hideLabel placeholder="Amount" />
      </Stack>
    ),
  },
  accessibility: [
    '`label` is required and is the accessible name; `hideLabel` is for fields whose context makes the question obvious, such as a search box.',
    '`description` and `error` are linked with `aria-describedby`; `error` sets `aria-invalid`.',
    'Pass `id` when an error summary links to the field.',
  ],
};
