import { DataField, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentViewer, DataField],
  whenToUse: [
    'A document the app generates from data (an agreement, an order form, a policy) for people to read and highlight. The document is the app’s own HTML: headings and `Text`, with `DataField` and `Highlight` inline.',
    'Highlights (`Highlight`) can show together in their own colours: the reader’s own (yellow), Find’s matches (blue), what an AI answer cites (purple). Pass `onHighlight` to let readers keep a selection as a highlight.',
  ],
  whenNotToUse: [
    { situation: 'A form with no document around it', instead: 'the form components (`Field`, `TextField`, `Select`…) on a page' },
    { situation: 'A PDF or a scanned file', instead: 'a preview in `Frame` that opens the file' },
    { situation: 'A short note or an AI answer', instead: '`Text` or `StreamingText`' },
  ],
  do: {
    caption: 'Merged values read as plain text; a value that fills later is a placeholder in the sentence it belongs to.',
    render: () => (
      <DocumentViewer label="Order form">
        <Text size="body-lg">
          Ordered by <DataField value="Acme Corp" /> on <DataField placeholder="the date it is signed" />. Signed by Maya Okafor.
        </Text>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Flagging an empty value inside the document: fix the data in the form that collected it.',
    render: () => (
      <DocumentViewer label="Order form">
        <Text size="body-lg">
          Ordered by Acme Corp on [MISSING DATE]. Either party may cancel with sixty days’ notice.
        </Text>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'The paper is an `article` named by `label`. Selecting text is native (::selection is not styled), so keyboard selection, copy and screen-reader reading all work as on any page; the menu above a selection is mirrored by the toolbar’s Highlight button for keyboard users.',
    'A placeholder that fills is announced once in a polite live region (“Effective date filled: 14 October 2026”) when `announceAs` is set. Every colour pair passes in light and dark (contrast test).',
  ],
};
