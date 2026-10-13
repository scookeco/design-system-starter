import { Document, DocumentViewer, Text, Watermark } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Watermark],
  whenToUse: [
    'A word across a document that isn’t final (“DRAFT”, “CONFIDENTIAL”), faint behind the text and on every printed page. By default it shows until the `Document` is executed; `when` takes any expression over its values and `lifecycle`.',
  ],
  whenNotToUse: [
    { situation: 'A document’s status in the app (Draft, Sent, Signed)', instead: 'a `Badge` in the `PageHeader`' },
    { situation: 'Marking what changed', instead: '`Change`' },
  ],
  do: {
    caption: 'One Watermark, shown by the document’s lifecycle.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement" lifecycle="negotiated">
          <Watermark />
          <Text>The Agreement.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: '“DRAFT” typed into the text: it stays after signing unless someone remembers to remove it.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>DRAFT</Text>
          <Text>The Agreement.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['An image named by its word, read once at the start of the document. Behind the text, it never blocks selecting or reading it.'],
};
