import { Document, DocumentAttachment, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentAttachment],
  whenToUse: ['A supporting file the person attaches to the document (proof of address, a certificate): `accept` limits the types, `multiple` allows several. The document stores the names; the app keeps the files.'],
  whenNotToUse: [
    { situation: 'Uploading files in the app', instead: '`FileUpload`' },
    { situation: 'An image that is part of the document', instead: '`Figure`' },
  ],
  do: {
    caption: 'A labelled file input that says what to attach.',
    render: () => (
      <DocumentViewer>
        <Document label="Application" lifecycle="filled">
          <DocumentAttachment name="proof" label="Proof of address" accept=".pdf,image/*" />
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: '“Attach proof of address” as text: nothing collects it or knows it’s missing.',
    render: () => (
      <DocumentViewer>
        <Document label="Application">
          <Text>Please attach proof of address.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A native file input named by its visible label; `required` until a file is attached.'],
};
