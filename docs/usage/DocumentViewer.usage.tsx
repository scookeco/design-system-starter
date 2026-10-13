import { DataField, Document, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentViewer, DataField],
  whenToUse: [
    'Showing one `Document` on screen for people to read and highlight: an agreement, an order form, a policy. The viewer is the screen render target only; the `Document` inside holds the content and numbering, with `DataField` and `Highlight` inline.',
    'A flow document is one continuous sheet on screen, at least a page tall; its pages break only in print. A grid document shows its fixed pages. Highlight, Change and the selection menu are a review layer on top of any document.',
    'Highlights (`Highlight`) can show together in their own colours: the reader’s own (yellow), Find’s matches (blue), what an AI answer cites (purple). Pass `onHighlight` to let readers keep a selection as a highlight.',
  ],
  whenNotToUse: [
    { situation: 'A form with no document around it', instead: 'the form components (`Field`, `TextField`, `Select`…) on a page' },
    { situation: 'A PDF or a scanned file', instead: 'a preview in `Frame` that opens the file' },
    { situation: 'A short note or an AI answer', instead: '`Text` or `StreamingText`' },
    { situation: 'Printing or exporting the document', instead: 'the `Document` alone: the viewer’s canvas and sheet drop away in print' },
  ],
  do: {
    caption: 'Merged values read as plain text; a value that fills later is a placeholder in the sentence it belongs to.',
    render: () => (
      <DocumentViewer>
        <Document label="Order form">
          <Text size="body-lg">
            Ordered by <DataField value="Acme Corp" /> on <DataField placeholder="the date it is signed" />. Signed by Maya Okafor.
          </Text>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Flagging an empty value inside the document: fix the data in the form that collected it.',
    render: () => (
      <DocumentViewer>
        <Document label="Order form">
          <Text size="body-lg">
            Ordered by Acme Corp on [MISSING DATE]. Either party may cancel with sixty days’ notice.
          </Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'The document is the `Document`’s `article`, named by its `label`. Selecting text is native (::selection is not styled), so keyboard selection, copy and screen-reader reading all work as on any page; the menu’s Highlight is mirrored by H (useShortcut, shown in the menu’s tooltip, and switchable off in the ? overlay), registered only while text in the document is selected.',
    'A placeholder that fills is announced once in a polite live region (“Effective date filled: 14 October 2026”) when `announceAs` is set. Every colour pair passes in light and dark (contrast test).',
  ],
};
