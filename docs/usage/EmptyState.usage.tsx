import { Button, EmptyState } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [EmptyState],
  whenToUse: [
    'In place of a list or table that has nothing to show, with the `reason`: `first-use`, `no-results` or `error`.',
    'Render it instead of the table, never beside an empty one.',
  ],
  whenNotToUse: [
    { situation: 'Content that is still loading', instead: '`Skeleton`' },
    { situation: 'An error on a page that otherwise works', instead: '`Banner`' },
  ],
  do: {
    caption: 'Say what goes here and offer the one action that fills it.',
    render: () => (
      <EmptyState
        reason="first-use"
        headingLevel={4}
        title="Create your first record"
        description="Records track agreements from draft to renewal."
        action={<Button icon="plus">New record</Button>}
      />
    ),
  },
  dont: {
    caption: 'A dead end: no explanation and no way forward.',
    render: () => <EmptyState reason="no-results" headingLevel={4} title="Nothing here" />,
  },
  accessibility: [
    'The title is a real heading (`headingLevel`, default 2) so the state is findable in the outline.',
    'The icon is decorative; the title and description carry the meaning.',
  ],
};
