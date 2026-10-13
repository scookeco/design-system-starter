import { Document, DocumentViewer, KeyValue, KeyValueItem, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [KeyValue, KeyValueItem],
  whenToUse: ['Label and value pairs in a document: an invoice’s number, date and terms; subtotal, tax and total (`emphasis` on the total). Format values with useFormat.'],
  whenNotToUse: [
    { situation: 'A record’s fields in the app', instead: 'the record page’s field list' },
    { situation: 'Defined terms', instead: '`Definitions`' },
    { situation: 'Rows with several columns', instead: '`Table`' },
  ],
  do: {
    caption: 'Pairs as a description list, the total set apart.',
    render: () => (
      <DocumentViewer>
        <Document label="Invoice">
          <KeyValue>
            <KeyValueItem label="Subtotal">$12,000.00</KeyValueItem>
            <KeyValueItem label="Total" emphasis>
              $13,020.00
            </KeyValueItem>
          </KeyValue>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Pairs as text with colons: labels and values can’t be told apart or exported.',
    render: () => (
      <DocumentViewer>
        <Document label="Invoice">
          <Text>Subtotal: $12,000.00 Total: $13,020.00</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `dl`: each label a `dt`, its value the `dd`, grouped in a `div`, so each pair is announced together.'],
};
