import { Clause, Document, DocumentList, DocumentListItem, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentList, DocumentListItem],
  whenToUse: ['A list in a document’s text that is not part of its structure: what to bring, conditions that all apply. `listStyle` sets the marker; numbered styles are an ordered list.'],
  whenNotToUse: [
    { situation: 'Numbered provisions people refer to (“Section 4.1(a)”)', instead: '`Clause`, so they renumber and take references' },
    { situation: 'Rows of data', instead: '`Table`' },
  ],
  do: {
    caption: 'A real list: its items are counted and announced.',
    render: () => (
      <DocumentViewer>
        <Document label="Offer letter">
          <DocumentList>
            <DocumentListItem>a photo identification;</DocumentListItem>
            <DocumentListItem>your bank details.</DocumentListItem>
          </DocumentList>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Numbered provisions as a list: nothing can refer to item 2, and inserting one leaves references wrong.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="termination" title="Termination">
            <Text>Either party may end it: 1. for breach; 2. on insolvency.</Text>
          </Clause>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['An `ol` or `ul` with `li` items, so the count and position are announced.'],
};
