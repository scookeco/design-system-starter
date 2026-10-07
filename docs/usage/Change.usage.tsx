import { Change, Clause, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Change],
  whenToUse: [
    'A redline: an agreement compared with an amendment or another version, marked as Microsoft Word marks tracked changes. Insertions underlined and deletions struck through in the author’s `color` (one per reviewer, the same as their signature block), moves green with double lines (`move-from`, `move-to`).',
    'A bar in the left margin marks every paragraph that holds a change. A whole clause inserted, deleted or moved takes a `change` on its `Clause`, and keeps its number.',
  ],
  whenNotToUse: [
    { situation: 'Changes an AI proposes before anyone accepts them', instead: '`ReviewChanges`' },
    { situation: 'Marking a passage for attention', instead: '`Highlight`' },
  ],
  do: {
    caption: 'Each change with its author, in that author’s colour.',
    render: () => (
      <DocumentViewer label="Compared">
        <Text>
          Liability will not exceed{' '}
          <Change kind="insert" author="Maya Okafor" color={3}>
            two times (2×)
          </Change>{' '}
          the fees of the prior twelve (12) months.
        </Text>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A whole clause rewritten as one insertion: mark the words that changed, or the clause with `change`.',
    render: () => (
      <DocumentViewer label="Compared">
        <Clause id="cap" title="Limitation of Liability">
          <Text>
            <Change kind="insert" author="Maya Okafor" color={3}>
              Liability will not exceed two times (2×) the fees of the prior twelve (12) months.
            </Change>
          </Text>
        </Clause>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'A change is an `<ins>` or `<del>`; what it is and who made it (“Deleted by Jon Park”) is announced from CSS, so it never ends up in copied text.',
    'Never colour alone: the underline, the strike, the double lines and the margin bar carry each change; the colour only says whose it is. Each author colour passes contrast on the paper in light and dark.',
  ],
};
