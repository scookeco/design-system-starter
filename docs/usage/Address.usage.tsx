import { Address, Document, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Address],
  whenToUse: ['A postal address in a document: an invoice’s bill-to, a letter’s recipient, an issuer’s address. `lines` in order; `label` above it; `name` is its data key for exports.'],
  whenNotToUse: [
    { situation: 'Collecting an address', instead: 'the address fields of a form' },
    { situation: 'An email address or a phone number alone', instead: 'text, or a `Link`' },
  ],
  do: {
    caption: 'One line per item, in an address element.',
    render: () => (
      <DocumentViewer>
        <Document label="Invoice">
          <Address label="Bill to" lines={['Globex Inc.', '1 Main Street', 'Seattle, WA 98101']} />
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'An address run into one line of text: it can’t be read as an address or exported.',
    render: () => (
      <DocumentViewer>
        <Document label="Invoice">
          <Text>Bill to: Globex Inc., 1 Main Street, Seattle, WA 98101</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['An `address` element with each line on its own line; the label is visible text above it.'],
};
