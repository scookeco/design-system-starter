import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Xref } from '../Xref/Xref';
import { Definition, Definitions } from './Definitions';

const meta = {
  title: 'Components/Definitions',
  component: Definitions,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Definitions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Definitions clause, and a clause that uses the terms through Xref. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Clause id="definitions" title="Definitions">
          <Definitions>
            <Definition term="Confidential Information">Non-public information a Party discloses, in any form, marked or reasonably understood as confidential.</Definition>
            <Definition term="Effective Date">The date of the last signature below.</Definition>
            <Definition term="Services">The services described in each Order Form.</Definition>
          </Definitions>
        </Clause>
        <Clause id="term" title="Term">
          <Text size="body-lg">
            The <Xref to="def-services" /> begin on the <Xref to="def-effective-date" />, and <Xref to="def-confidential-information" /> stays confidential for three (3) years.
          </Text>
        </Clause>
      </Document>
    </DocumentViewer>
  ),
};

/** A term defined twice: marked in place and reported in the console. */
export const DefinedTwice: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Order form">
        <Definitions>
          <Definition term="Fees">The amounts in the Order Form.</Definition>
          <Definition term="Fees">The amounts invoiced.</Definition>
        </Definitions>
      </Document>
    </DocumentViewer>
  ),
};
