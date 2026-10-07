import { Clause, ClauseNote, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [ClauseNote],
  whenToUse: [
    'A note on a clause for whoever drafts or reviews the agreement: its negotiation position (`balanced`, `seller-favored`, `buyer-favored`) with one line of why, or the contract type it comes from in the clause library (`source`, in that type’s `color`).',
    'Pass it to a `Clause`’s `note`: it sits in the margin beside the paper when the viewer is at least size.breakpoint.lg wide, and under the clause heading when it is narrower. It is never printed.',
  ],
  whenNotToUse: [
    { situation: 'A comment someone left on the text', instead: 'the app’s comment thread (`ChatThread`, `Message`)' },
    { situation: 'Text the parties sign', instead: 'the clause itself' },
  ],
  do: {
    caption: 'A position named in words, with the reason in one line.',
    render: () => (
      <DocumentViewer label="Agreement">
        <Clause id="cap" title="Limitation of Liability" note={<ClauseNote position="balanced">Cap at the fees of the prior 12 months</ClauseNote>}>
          <Text>Each Party’s liability is capped at the fees of the prior twelve (12) months.</Text>
        </Clause>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A drafting remark typed into the clause: it would be signed with the agreement.',
    render: () => (
      <DocumentViewer label="Agreement">
        <Clause id="cap" title="Limitation of Liability">
          <Text>Each Party’s liability is capped at the fees of the prior twelve (12) months. [Balanced — check with legal]</Text>
        </Clause>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'A note has role="note" and reads as “Position Balanced …” right after the clause heading, wherever it is drawn.',
    'Colour is never the only cue: the words name the position and the source; a source’s bar repeats its contract type’s colour.',
  ],
};
