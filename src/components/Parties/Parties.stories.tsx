import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { DateSigned, Signature } from '../Signature/Signature';
import { Text } from '../Text/Text';
import { Parties, Party } from './Parties';

const meta = {
  title: 'Components/Parties',
  component: Parties,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Parties>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three parties declared once (not shown); each signing tab takes its party's colour by declaration order. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" type="w-4">
        <Parties>
          <Party role="employee" name="Employee" order={1} />
          <Party role="employer" name="Employer" order={2} />
          <Party role="hr" name="HR" kind="cc" />
        </Parties>
        <Text size="body-lg">Employee</Text>
        <Cluster gap="lg">
          <Signature role="employee" />
          <DateSigned role="employee" />
        </Cluster>
        <Text size="body-lg">Employer</Text>
        <Cluster gap="lg">
          <Signature role="employer" />
          <DateSigned role="employer" />
        </Cluster>
      </Document>
    </DocumentViewer>
  ),
};
