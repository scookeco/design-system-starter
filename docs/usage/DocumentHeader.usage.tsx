import { Document, DocumentFooter, DocumentHeader, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentHeader, DocumentFooter],
  whenToUse: [
    'Running text on a document’s printed pages: a header (“Master Services Agreement · Confidential”) and a footer, with the page number from `pageNumber` (“Page 2”, or “Page 2 of 5” with "of").',
    '`pages` says where it runs: all (the default), first, or rest (every page but the first, under a letterhead). On screen each shows once, above or below the document.',
  ],
  whenNotToUse: [
    { situation: 'The issuer’s block on the first page', instead: '`Letterhead`' },
    { situation: 'A document’s title', instead: '`DocumentTitle`' },
    { situation: 'A header for an app page', instead: '`PageHeader`' },
  ],
  do: {
    caption: 'Text only, with the page number from the page counter.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <DocumentHeader pages="rest">Master Services Agreement · Confidential</DocumentHeader>
          <Text>The Agreement.</Text>
          <DocumentFooter pageNumber="of" />
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: '“Page 1” typed into the text: it prints on one page and is wrong on all the others.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>The Agreement.</Text>
          <Text>Page 1</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'A `header` and a `footer` inside the document’s `article`, so not page landmarks; read once, in order, on screen.',
    'In print they run in the page margins (Chromium page margin boxes, an enhancement: other browsers print without them). They show text only.',
  ],
};
