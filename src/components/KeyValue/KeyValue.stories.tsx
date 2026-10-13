import type { Meta, StoryObj } from '@storybook/react-vite';
import { Address } from '../Address/Address';
import { Document, DocumentGrid, DocumentPage } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { KeyValue, KeyValueItem } from './KeyValue';

const meta = {
  title: 'Components/KeyValue',
  component: KeyValue,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof KeyValue>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An invoice page: its number, date and terms, the bill-to address, and the totals with the total in bold. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Invoice INV-2026-0413" type="invoice" shell="grid" headingLevel={3}>
        <DocumentPage>
          <DocumentGrid cols={12}>
            <Address label="Bill to" name="bill_to" lines={['Globex Inc.', '1 Main Street', 'Seattle, WA 98101']} area={{ row: 1, column: 1, rowSpan: 3, columnSpan: 6 }} />
            <KeyValue area={{ row: 1, column: 8, rowSpan: 3, columnSpan: 5 }}>
              <KeyValueItem label="Invoice">INV-2026-0413</KeyValueItem>
              <KeyValueItem label="Date">13 October 2026</KeyValueItem>
              <KeyValueItem label="Terms">Net 30</KeyValueItem>
            </KeyValue>
            <KeyValue area={{ row: 6, column: 8, rowSpan: 3, columnSpan: 5 }}>
              <KeyValueItem label="Subtotal">$12,000.00</KeyValueItem>
              <KeyValueItem label="Tax (8.5%)">$1,020.00</KeyValueItem>
              <KeyValueItem label="Total" emphasis>
                $13,020.00
              </KeyValueItem>
            </KeyValue>
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};
