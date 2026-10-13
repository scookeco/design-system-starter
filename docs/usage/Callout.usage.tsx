import { Callout, Document, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Callout],
  whenToUse: ['A notice that is part of the document, set apart from its text: a note, a warning, or instructions for whoever fills it in (“Complete Step 2 only if…”). `title` replaces the kind’s word.'],
  whenNotToUse: [
    { situation: 'A message about the app or the task (an error, a save)', instead: '`Banner`' },
    { situation: 'A note for whoever drafts the document, not part of it', instead: 'a `ClauseNote` in a `Margin`' },
  ],
  do: {
    caption: 'Instructions in the document, labelled in words, never by colour alone.',
    render: () => (
      <DocumentViewer>
        <Document label="Form">
          <Callout kind="instruction">Complete Step 2 only if you hold more than one job.</Callout>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Instructions in bold capitals in the text: they read as part of what is signed.',
    render: () => (
      <DocumentViewer>
        <Document label="Form">
          <Text>COMPLETE STEP 2 ONLY IF YOU HOLD MORE THAN ONE JOB.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['An `aside` with its kind or `title` as its first line; it never announces itself (unlike a Banner), because it is part of the document.'],
};
