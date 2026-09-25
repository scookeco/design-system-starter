import { Stack, Text, Timeline } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Timeline],
  whenToUse: [
    'A record’s activity, an audit trail, a feed of changes: dated events, each a sentence of actor, verb and target.',
    'Format `time` for people (“2 hours ago”, “12 Mar 2026, 14:05”) and pass the ISO `dateTime` beside it; the component doesn’t format dates.',
    'Pass a `Link` as `target` when the thing changed has its own page. Put a comment or a before-and-after in `detail`.',
  ],
  whenNotToUse: [
    { situation: 'The steps of a task still to do', instead: '`Stepper`' },
    { situation: 'Rows to sort, filter or act on', instead: '`Table`' },
  ],
  do: {
    caption: 'Each event is one sentence with who, what and when.',
    render: () => (
      <Timeline
        label="Activity on INV-2041"
        events={[
          { id: '2', actor: 'Priya Shah', verb: 'marked the invoice as', target: 'Paid', time: '12 Mar 2026, 14:05', dateTime: '2026-03-12T14:05:00Z' },
          { id: '1', actor: 'Priya Shah', verb: 'created the invoice', time: '1 Mar 2026, 16:22', dateTime: '2026-03-01T16:22:00Z' },
        ]}
      />
    ),
  },
  dont: {
    caption: 'Bare field changes without who or when: nobody can tell what happened.',
    render: () => (
      <Stack gap="xs">
        <Text>status → Paid</Text>
        <Text>created</Text>
      </Stack>
    ),
  },
  accessibility: [
    'An ordered list named by `label`; each event is a sentence with a `<time datetime>`, so it reads the same without the rail and markers (which are hidden).',
    'An empty list renders `emptyText` instead of an empty list.',
  ],
};
