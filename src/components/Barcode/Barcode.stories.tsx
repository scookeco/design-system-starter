import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Barcode } from './Barcode';

const meta = {
  title: 'Components/Barcode',
  component: Barcode,
  args: { value: 'INV-2026-0413' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Barcode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A document's id as a QR code: dark on light in either theme, so it scans from the screen and the page. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Invoice INV-2026-0413">
        <Cluster gap="md">
          <Barcode value="INV-2026-0413" />
          <Text>Scan to open this invoice.</Text>
        </Cluster>
      </Document>
    </DocumentViewer>
  ),
};

/** A longer value (a verification link) takes a larger version: the symbol keeps its size, its modules get smaller. */
export const Link: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Certificate">
        <Barcode value="https://verify.example.test/certificates/2026/ATI-000412?sig=7f3a9c" />
      </Document>
    </DocumentViewer>
  ),
};
