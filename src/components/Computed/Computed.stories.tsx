import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { KeyValue, KeyValueItem } from '../KeyValue/KeyValue';
import { Computed } from './Computed';

const meta = {
  title: 'Components/Computed',
  component: Computed,
  args: { name: 'total', formula: 'subtotal + tax' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Computed>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A quote's tax and total, recomputed as the subtotal and rate are typed. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Quote" lifecycle="filled" defaultValues={{ subtotal: 1200000, tax_rate: 0.085 }}>
        <KeyValue>
          <KeyValueItem label="Subtotal">
            <DocumentField name="subtotal" label="Subtotal" type="currency" />
          </KeyValueItem>
          <KeyValueItem label="Tax rate">
            <DocumentField name="tax_rate" label="Tax rate" type="number" />
          </KeyValueItem>
          <KeyValueItem label="Tax">
            <Computed name="tax" formula="subtotal * tax_rate" format="currency" />
          </KeyValueItem>
          <KeyValueItem label="Total" emphasis>
            <Computed name="total" formula="subtotal + tax" format="currency" />
          </KeyValueItem>
        </KeyValue>
      </Document>
    </DocumentViewer>
  ),
};

/** Other formats: a percentage and a plain number. */
export const Formats: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Report" values={{ passed: 46, checked: 50 }}>
        <KeyValue>
          <KeyValueItem label="Pass rate">
            <Computed name="rate" formula="passed / checked" format="percent" />
          </KeyValueItem>
          <KeyValueItem label="Failed">
            <Computed name="failed" formula="checked - passed" />
          </KeyValueItem>
        </KeyValue>
      </Document>
    </DocumentViewer>
  ),
};
