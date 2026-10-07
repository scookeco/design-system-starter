import { DataField, DocumentField, DocumentViewer, Highlight, Text } from '../../src/index';
import type { UsageDoc } from './types';

const maya = { name: 'Maya Okafor', category: 1 } as const;

export const usage: UsageDoc = {
  covers: [DocumentViewer, Highlight, DataField, DocumentField],
  whenToUse: [
    'A document the app generates from data (an agreement, an order form, a policy) for people to read, highlight and complete fields in. The document is the app’s own HTML: headings and `Text`, with `DataField`, `Highlight` and `DocumentField` inline.',
    'Highlights come in three layers and only one shows at a time: `yours` (the reader’s own, yellow), `search` (Find’s matches, blue) and `ai` (what an answer cites, purple). Pass `onHighlight` to let readers keep a selection as a highlight.',
    'Signing and approval flows: each `DocumentField` belongs to a signer, in that signer’s category colour. An outline means it is yours to complete; another signer’s is flat (`yours={false}`). A field opens as the system’s own control (`editor`) or the app’s flow (`onActivate`).',
  ],
  whenNotToUse: [
    { situation: 'A form with no document around it', instead: 'the form components (`Field`, `TextField`, `Select`…) on a page' },
    { situation: 'A PDF or a scanned file', instead: 'a preview in `Frame` that opens the file' },
    { situation: 'A short note or an AI answer', instead: '`Text` or `StreamingText`' },
  ],
  do: {
    caption: 'Merged values read as plain text; a value that fills later is a placeholder; a field sits in the sentence it belongs to.',
    render: () => (
      <DocumentViewer label="Order form">
        <Text size="body-lg">
          Ordered by <DataField value="Acme Corp" /> on <DataField placeholder="the date it is signed" />. Signed by{' '}
          <DocumentField kind="signature" label="Sign" signer={maya} required />
        </Text>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Flagging an empty value inside the document, or showing two highlight colours at once: fix data in the form that collected it, and keep one layer.',
    render: () => (
      <DocumentViewer label="Order form">
        <Text size="body-lg">
          Ordered by Acme Corp on [MISSING DATE]. Either party may cancel with <Highlight tone="yours">sixty days’ notice</Highlight>.
        </Text>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'The paper is an `article` named by `label`. Selecting text is native (::selection is not styled), so keyboard selection, copy and screen-reader reading all work as on any page; the menu above a selection is mirrored by the toolbar’s Highlight button for keyboard users.',
    'A highlight is a `<mark>`; the current one carries `aria-current`. Its background is its only mark, so list highlights somewhere reachable without colour (an outline, Find’s results).',
    'A `DocumentField` is a button named “Sign, required, Maya Okafor” (or its value once filled); another signer’s is announced as “Sign, Jon Park’s field” and is not focusable. Fields and placeholders are not part of a text selection.',
    'A placeholder that fills is announced once in a polite live region (“Effective date filled: 14 October 2026”) when `announceAs` is set. Every colour pair passes in light and dark (contrast test).',
  ],
};
