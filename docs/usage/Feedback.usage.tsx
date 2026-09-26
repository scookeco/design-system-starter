import { Button, Cluster, Feedback } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Feedback],
  whenToUse: [
    'Under an AI result (an answer, a summary, a suggestion) to learn whether it helped.',
    'A thumbs down asks for a reason, which the person can skip. Say what feedback is for in `thanks`.',
  ],
  whenNotToUse: [
    { situation: 'Rating the product or a support conversation', instead: 'a survey, not per-result feedback' },
    { situation: 'Reporting harmful content', instead: 'a “Report” action that reaches a person' },
  ],
  do: {
    caption: 'Two labelled toggles; the reason comes only after a thumbs down.',
    render: () => <Feedback onFeedback={() => undefined} />,
  },
  dont: {
    caption: 'Unlabelled buttons that don’t say whether anything was sent.',
    render: () => (
      <Cluster gap="xs">
        <Button variant="ghost" size="sm">
          👍
        </Button>
        <Button variant="ghost" size="sm">
          👎
        </Button>
      </Cluster>
    ),
  },
  accessibility: [
    'Both are toggle buttons with visible labels (“Helpful”, “Not helpful”) and `aria-pressed`, in a group named by `label`.',
    'A polite status, present from mount, announces the thanks once feedback is sent.',
  ],
};
