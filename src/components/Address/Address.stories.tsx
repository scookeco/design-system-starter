import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Address } from './Address';

const meta = {
  title: 'Components/Address',
  component: Address,
  args: { lines: ['Globex Inc.', '1 Main Street', 'Seattle, WA 98101'] },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Address>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A labelled address, bound to its data key. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Invoice">
        <Address label="Bill to" name="bill_to" lines={['Globex Inc.', '1 Main Street', 'Seattle, WA 98101']} />
      </Document>
    </DocumentViewer>
  ),
};

/** Without a label: a letter's recipient. */
export const Unlabelled: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Letter">
        <Address lines={['Maya Okafor', '22 Harbor Road', 'Portland, OR 97201']} />
      </Document>
    </DocumentViewer>
  ),
};
