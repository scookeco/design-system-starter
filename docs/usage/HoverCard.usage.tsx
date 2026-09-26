import { HoverCard, Link, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [HoverCard],
  whenToUse: [
    'A preview of where a link goes: a person’s role and team behind their name, a record’s status behind its ID.',
    'Supplementary only. It opens on hover and keyboard focus, never on touch, and screen readers don’t reach its content, so everything in it must also be on the page the trigger leads to.',
  ],
  whenNotToUse: [
    { situation: 'Anything people need to finish the task', instead: 'show it on the page' },
    { situation: 'Buttons, links or fields', instead: '`Popover` (opens on click and takes focus)' },
    { situation: 'Naming an icon button', instead: '`Tooltip`' },
  ],
  do: {
    caption: 'The trigger is a link to the full profile; the card previews it.',
    render: () => (
      <HoverCard trigger={<Link href="#people/priya">Priya Shah</Link>}>
        <Stack gap="2xs">
          <Text>Priya Shah</Text>
          <Text size="caption" tone="muted">
            Finance lead
          </Text>
        </Stack>
      </HoverCard>
    ),
  },
  dont: {
    caption: 'A trigger that goes nowhere, with the only copy of the approver’s decision in the card.',
    render: () => (
      <HoverCard trigger={<Link href="#">Approval</Link>}>
        <Text>Rejected: the amount exceeds the budget.</Text>
      </HoverCard>
    ),
  },
  accessibility: [
    'The trigger must be focusable (a `Link`); the card opens on focus and closes on blur and Escape.',
    'The content isn’t focusable and isn’t announced. Keep it non-interactive and duplicated at the destination.',
  ],
};
