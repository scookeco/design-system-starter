import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Watermark } from './Watermark';

const meta = {
  title: 'Components/Watermark',
  component: Watermark,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Watermark>;

export default meta;
type Story = StoryObj<typeof meta>;

function Msa({ lifecycle, text }: { lifecycle: 'negotiated' | 'executed'; text?: string }) {
  return (
    <DocumentViewer>
      <Document label="Master services agreement" lifecycle={lifecycle}>
        <Watermark text={text} />
        <Clause id="term" title="Term">
          <Text size="body-lg">This Agreement begins on the Effective Date and continues for twenty-four (24) months.</Text>
        </Clause>
      </Document>
    </DocumentViewer>
  );
}

/** “DRAFT” behind a document still in negotiation. */
export const Default: Story = { render: () => <Msa lifecycle="negotiated" /> };

/** Another word. */
export const Confidential: Story = { render: () => <Msa lifecycle="negotiated" text="CONFIDENTIAL" /> };

/** Gone once the document is executed. */
export const Executed: Story = { render: () => <Msa lifecycle="executed" /> };
