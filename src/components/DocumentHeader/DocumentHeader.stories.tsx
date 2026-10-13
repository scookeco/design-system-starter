import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { DocumentFooter, DocumentHeader } from './DocumentHeader';

const meta = {
  title: 'Components/DocumentHeader',
  component: DocumentHeader,
  args: { children: 'Master Services Agreement · Confidential' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A running header on every page but the first, and a footer with “Page 2 of 5” on every page. On screen each shows once; print the story to see them run. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement" type="msa">
        <DocumentHeader pages="rest">Master Services Agreement · Confidential</DocumentHeader>
        <Clause id="term" title="Term">
          <Text size="body-lg">This Agreement begins on the Effective Date and continues for twenty-four (24) months.</Text>
        </Clause>
        <DocumentFooter pageNumber="of">Acme Corp · MSA v3.2</DocumentFooter>
      </Document>
    </DocumentViewer>
  ),
};

/** A footer with the page number alone. */
export const PageNumberOnly: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Offer letter" type="offer-letter">
        <Text size="body-lg">Dear Maya, we are pleased to offer you the role of Legal counsel.</Text>
        <DocumentFooter pageNumber="page" />
      </Document>
    </DocumentViewer>
  ),
};
