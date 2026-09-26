import { Button, ReviewChanges, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [ReviewChanges],
  whenToUse: [
    'Before an AI changes anything: the proposed changes as diffs (a field’s before and after, or a text rewrite word by word), each accepted or rejected, then applied together.',
    'After applying, pass `outcomes` (each change’s result) and `onUndo`: one Undo restores exactly what was there before.',
    'Mark a change the person can’t make with `blockedReason` instead of hiding it, so the count adds up.',
  ],
  whenNotToUse: [
    { situation: 'A single suggestion inside a field', instead: '`Suggestion`' },
    { situation: 'Changes a person made by hand', instead: 'the action itself, with a Toast and Undo' },
  ],
  do: {
    caption: 'Each change shows what it was, what it will be and why; nothing is applied until accepted.',
    render: () => (
      <ReviewChanges
        title="Proposed changes to 1 record"
        changes={[{ id: 'c1', target: 'Master cleaning agreement', field: 'Status', before: 'Overdue', after: 'Pending', reason: 'A signed renewal was added on 12 Sep.' }]}
        onApply={() => undefined}
      />
    ),
  },
  dont: {
    caption: 'An AI action that applies at once with no preview: people can’t see what will change, or undo it.',
    render: () => (
      <Text>
        <Button>Fix overdue records with AI</Button>
      </Text>
    ),
  },
  accessibility: [
    'Removed and added text is struck through and underlined as well as tinted, and each carries a visually hidden “removed”/“added” (or “Was … will be …”), because screen readers don’t announce `del` and `ins`.',
    'Accept and Reject are toggle buttons (`aria-pressed`) grouped per change and named by it; the count of accepted changes and the result after applying are polite status messages.',
  ],
};
