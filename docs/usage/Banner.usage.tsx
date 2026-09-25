import { Banner, Button } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Banner],
  whenToUse: [
    'A page-level message that stays until it is resolved: a failed load, a limit reached, an error summary after submit.',
    'Put the fixing action in `action`.',
  ],
  whenNotToUse: [
    { situation: 'A passing confirmation', instead: '`Toast`' },
    { situation: 'An error on one field', instead: 'the field’s `error` prop' },
    { situation: 'Marketing or announcements', instead: 'nothing in the product frame; they erode trust in real warnings' },
  ],
  do: {
    caption: 'What happened, then how to fix it, with the fix one click away.',
    render: () => (
      <Banner tone="warning" title="Seat limit almost reached" action={<Button variant="secondary" size="sm">Add seats</Button>}>
        9 of 10 seats are in use. New invites will fail at the limit.
      </Banner>
    ),
  },
  dont: {
    caption: 'A warning tone with no explanation or next step.',
    render: () => <Banner tone="danger">Error.</Banner>,
  },
  accessibility: [
    'Tone sets the live region: danger and warning are `role="alert"`, info and success `role="status"`.',
    'Render the banner when the condition starts; one already present on page load is not announced.',
    'Tone is shown as an icon and text as well as colour.',
  ],
};
