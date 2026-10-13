import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Exhibit } from '../Exhibit/Exhibit';
import { Text } from '../Text/Text';
import { Toc } from './Toc';

const meta = {
  title: 'Components/Toc',
  component: Toc,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Toc>;

export default meta;
type Story = StoryObj<typeof meta>;

function Msa({ depth }: { depth?: number }) {
  return (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Toc depth={depth} />
        <Clause id="services" title="Services">
          <Clause id="scope" title="Scope">
            <Text size="body-lg">As in each Order Form.</Text>
          </Clause>
          <Clause id="changes" title="Changes">
            <Text size="body-lg">By written change order.</Text>
          </Clause>
        </Clause>
        <Clause id="fees" title="Fees">
          <Text size="body-lg">Net 30.</Text>
        </Clause>
        <Exhibit id="dpa" title="Data Processing Agreement">
          <Clause id="roles" title="Roles">
            <Text size="body-lg">Customer is the controller.</Text>
          </Clause>
        </Exhibit>
      </Document>
    </DocumentViewer>
  );
}

/** Two levels: clauses and their sub-clauses, then each exhibit with its clauses. */
export const Default: Story = { render: () => <Msa /> };

/** One level: top-level clauses and exhibits only. */
export const TopLevelOnly: Story = { render: () => <Msa depth={1} /> };
