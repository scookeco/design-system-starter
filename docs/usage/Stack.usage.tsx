import { Button, Stack, TextField } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Stack],
  whenToUse: [
    'Anything that flows top to bottom: page sections, form fields, a card body.',
    'Pick the `gap` from the scale; pass `as` for semantics (`section`, `form`, `ul`, `dl`).',
  ],
  whenNotToUse: [
    { situation: 'Items side by side', instead: '`Cluster`' },
    { situation: 'Equal items that should reflow into columns', instead: '`Grid`' },
  ],
  do: {
    caption: 'One Stack owns the rhythm of the form; the fields bring no margins of their own.',
    render: () => (
      <Stack as="form" gap="md" align="start" aria-label="Invite">
        <TextField label="Name" />
        <TextField label="Email" type="email" />
        <Button type="submit">Send invite</Button>
      </Stack>
    ),
  },
  dont: {
    caption: 'Nested Stacks with mixed gaps for the same rhythm: spacing drifts field by field.',
    render: () => (
      <Stack gap="2xs" aria-label="Invite">
        <Stack gap="xl">
          <TextField label="Name" />
        </Stack>
        <TextField label="Email" type="email" />
      </Stack>
    ),
  },
  accessibility: [
    'Layout only: it adds no roles. Use `as` so the element matches the content (a list is a `ul`).',
    'Visual order is DOM order, so reading and focus order stay aligned.',
  ],
};
