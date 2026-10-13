import { Address, Document, DocumentViewer, Heading, Letterhead, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Letterhead],
  whenToUse: ['The issuer’s block at the top of a letter, an invoice or a certificate: its mark (`logo`), name and `Address`, above a rule. First page only.'],
  whenNotToUse: [
    { situation: 'Text that runs on every page', instead: '`DocumentHeader`' },
    { situation: 'An agreement’s title and parties', instead: '`DocumentTitle`' },
  ],
  do: {
    caption: 'The issuer named in text, with its address as an Address.',
    render: () => (
      <DocumentViewer>
        <Document label="Offer letter">
          <Letterhead>
            <Heading level={2} size={4}>
              Acme Corp
            </Heading>
            <Address lines={['500 Pine Street', 'Seattle, WA 98101']} />
          </Letterhead>
          <Text>Dear Maya,</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A letterhead that is only an image: its name and address can’t be read, copied or exported.',
    render: () => (
      <DocumentViewer>
        <Document label="Offer letter">
          <Text>[Letterhead image]</Text>
          <Text>Dear Maya,</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `header` inside the document’s `article`; the issuer’s name is real text, and a logo image needs its own alternative text.'],
};
