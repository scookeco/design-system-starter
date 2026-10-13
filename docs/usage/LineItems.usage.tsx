import { Computed, Document, DocumentField, DocumentViewer, LineItems, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [LineItems],
  whenToUse: ['An invoice’s, a quote’s or a purchase order’s lines: a table repeating a row template (one field or `Computed` per column), with a Computed amount per line that totals sum (`sum(items.amount)`).'],
  whenNotToUse: [
    { situation: 'Rows that aren’t a table (employment history)', instead: '`Repeat`' },
    { situation: 'A static table in a document', instead: '`Table`' },
  ],
  do: {
    caption: 'Lines as data, amounts computed.',
    render: () => (
      <DocumentViewer>
        <Document label="Invoice" values={{ items: [{ description: 'Setup', qty: 1, unit_price: 50000 }] }}>
          <LineItems name="items" caption="Line items" columns={[{ label: 'Description' }, { label: 'Qty', numeric: true }, { label: 'Unit price', numeric: true }, { label: 'Amount', numeric: true }]}>
            <DocumentField name="description" label="Description" />
            <DocumentField name="qty" label="Qty" type="number" />
            <DocumentField name="unit_price" label="Unit price" type="currency" />
            <Computed name="amount" formula="qty * unit_price" format="currency" />
          </LineItems>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Lines and amounts typed into text: nothing adds up when one changes.',
    render: () => (
      <DocumentViewer>
        <Document label="Invoice">
          <Text>Setup × 1 @ $500.00 = $500.00</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `Table` named by `caption` (visually hidden), with column headers; each input is named by its column’s label, and each Remove by its line.'],
};
