import { Button, Checkbox, Stack } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Checkbox],
  whenToUse: [
    'An independent yes/no inside a form that is saved with the form.',
    'Several independent choices from a short list; `indeterminate` for a “select all” parent.',
  ],
  whenNotToUse: [
    { situation: 'A setting that applies immediately', instead: '`Switch`' },
    { situation: 'Exactly one of several options', instead: '`RadioGroup`' },
  ],
  do: {
    caption: 'Part of a form: nothing happens until Save.',
    render: () => (
      <Stack gap="md" align="start">
        <Checkbox label="Send a copy to the record owner" defaultChecked />
        <Button variant="secondary">Save</Button>
      </Stack>
    ),
  },
  dont: {
    caption: 'A negative label makes checked mean “no”. Phrase the option positively.',
    render: () => <Checkbox label="Don’t send me updates" />,
  },
  accessibility: [
    '`label` is required and clicking it toggles the box; `description` is linked to the control.',
    'The mixed state is exposed as `aria-checked="mixed"`, not only drawn.',
  ],
};
