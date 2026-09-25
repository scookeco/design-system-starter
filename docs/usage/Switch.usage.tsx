import { Stack, Switch } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Switch],
  whenToUse: ['A setting that takes effect the moment it is flipped, like the notification settings on a settings page.'],
  whenNotToUse: [
    { situation: 'A choice saved with the rest of a form', instead: '`Checkbox`' },
    { situation: 'Choosing between two named options', instead: '`RadioGroup`' },
  ],
  do: {
    caption: 'The label names the setting; the switch shows its state.',
    render: () => (
      <Stack gap="md">
        <Switch label="Email me a weekly digest" description="Every Monday morning." defaultChecked />
      </Stack>
    ),
  },
  dont: {
    caption: 'A label that describes the state (“On”) reads wrong as soon as the switch changes.',
    render: () => <Switch label="On" defaultChecked />,
  },
  accessibility: [
    'Exposed as `role="switch"` with `aria-checked`; Space toggles it.',
    'Confirm the change with a quiet status (for example a Toast) when the effect isn’t visible on the page.',
  ],
};
