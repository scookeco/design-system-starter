import type { Meta, StoryObj } from '@storybook/react-vite';
import { Computed } from '../Computed/Computed';
import { Document } from '../Document/Document';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { KeyValue, KeyValueItem } from '../KeyValue/KeyValue';
import { LineItems } from './LineItems';

const meta = {
  title: 'Components/LineItems',
  component: LineItems,
  args: { name: 'items', caption: 'Line items', columns: [], children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof LineItems>;

export default meta;
type Story = StoryObj<typeof meta>;

const ITEMS = {
  items: [
    { description: 'Implementation', qty: 1, unit_price: 500000 },
    { description: 'User licences', qty: 25, unit_price: 12000 },
  ],
};

function Invoice({ lifecycle }: { lifecycle: 'generated' | 'filled' }) {
  return (
    <DocumentViewer>
      <Document label="Invoice INV-2026-0413" type="invoice" lifecycle={lifecycle} defaultValues={ITEMS}>
        <LineItems name="items" caption="Line items" columns={[{ label: 'Description' }, { label: 'Qty', numeric: true }, { label: 'Unit price', numeric: true }, { label: 'Amount', numeric: true }]}>
          <DocumentField name="description" label="Description" />
          <DocumentField name="qty" label="Qty" type="number" />
          <DocumentField name="unit_price" label="Unit price" type="currency" />
          <Computed name="amount" formula="qty * unit_price" format="currency" />
        </LineItems>
        <KeyValue>
          <KeyValueItem label="Subtotal">
            <Computed name="subtotal" formula="sum(items.amount)" format="currency" />
          </KeyValueItem>
          <KeyValueItem label="Tax (8.5%)">
            <Computed name="tax" formula="subtotal * 0.085" format="currency" />
          </KeyValueItem>
          <KeyValueItem label="Total" emphasis>
            <Computed name="total" formula="subtotal + tax" format="currency" />
          </KeyValueItem>
        </KeyValue>
      </Document>
    </DocumentViewer>
  );
}

/** Generated from data: lines, amounts and totals as text. */
export const Default: Story = { render: () => <Invoice lifecycle="generated" /> };

/** A quote being filled in: lines are inputs, added and removed; amounts and totals follow. */
export const Fillable: Story = { render: () => <Invoice lifecycle="filled" /> };
