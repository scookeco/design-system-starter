import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { DocumentAttachment } from './DocumentAttachment';

const meta = {
  title: 'Components/DocumentAttachment',
  component: DocumentAttachment,
  args: { name: 'proof', label: 'Proof of address' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentAttachment>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fillable: a native file input for a supporting document. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Loan application" lifecycle="filled">
        <DocumentAttachment name="proof" label="Proof of address" accept=".pdf,image/*" required role="applicant" />
      </Document>
    </DocumentViewer>
  ),
};

/** Executed: the attached files' names. */
export const Executed: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Loan application" lifecycle="executed" values={{ proof: ['lease-2026.pdf', 'utility-bill.pdf'] }}>
        <DocumentAttachment name="proof" label="Proof of address" multiple />
      </Document>
    </DocumentViewer>
  ),
};
