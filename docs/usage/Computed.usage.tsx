import { Computed, Document, DocumentViewer, KeyValue, KeyValueItem, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Computed],
  whenToUse: [
    'A value derived from others, never typed: a line’s amount (`qty * unit_price`), a subtotal (`sum(items.amount)`), tax and total. It recomputes on every change and reads like a filled field, formatted as a number, currency (integer minor units), a percentage or text.',
    'Other formulas use it by `name`; inside a Repeat row it computes per row, and `sum(items.amount)` totals the rows.',
  ],
  whenNotToUse: [
    { situation: 'A value a person types', instead: '`DocumentField`' },
    { situation: 'A total the app already has', instead: 'a `DocumentField` merged from data' },
  ],
  do: {
    caption: 'Totals as formulas over the values: change a line and they follow.',
    render: () => (
      <DocumentViewer>
        <Document label="Quote" values={{ subtotal: 100000 }}>
          <KeyValue>
            <KeyValueItem label="Tax">
              <Computed name="tax" formula="subtotal * 0.085" format="currency" />
            </KeyValueItem>
          </KeyValue>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A total typed in: it is wrong the moment a line changes.',
    render: () => (
      <DocumentViewer>
        <Document label="Quote">
          <Text>Tax: $85.00</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['An `output` element, read as text; it is never focusable or editable. A formula that doesn’t parse is reported in the console and shows nothing.'],
};
