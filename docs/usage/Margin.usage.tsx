import { Clause, ClauseNote, Document, DocumentViewer, Margin, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Margin],
  whenToUse: [
    'What sits beside the text rather than in it: a clause’s note for whoever drafts or reviews it (Clause `note` puts its ClauseNote in a Margin), and the per-page initials slot.',
    'It sits in the margin beside the paper when the viewer is at least 75rem wide, and in the flow under what it annotates when it is narrower. `side` picks the end (default) or start margin.',
  ],
  whenNotToUse: [
    { situation: 'A notice that is part of the document', instead: '`Callout`' },
    { situation: 'A comment thread on a passage', instead: 'the review tools around the DocumentViewer' },
  ],
  do: {
    caption: 'A clause note in the margin, through Clause note.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="cap" title="Liability" note={<ClauseNote position="balanced" />}>
            <Text>Capped at twelve months of fees.</Text>
          </Clause>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A note typed into the clause’s text: it prints and gets signed as part of the agreement.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="cap" title="Liability">
            <Text>Capped at twelve months of fees. (Note: balanced position.)</Text>
          </Clause>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'An `aside` in source order right after what it annotates, so it is read next to it at any width.',
    'Placed by a container query on the viewer’s canvas, not by the viewport.',
  ],
};
