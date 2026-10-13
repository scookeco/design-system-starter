import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Parties, Party } from '../Parties/Parties';
import { Text } from '../Text/Text';
import { Acknowledge } from './Acknowledge';

const meta = {
  title: 'Components/Acknowledge',
  component: Acknowledge,
  args: { role: 'employee', text: 'I have read and agree to the Employee Handbook' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Acknowledge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The last page of a handbook: the employee checks the box and signs. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee handbook" type="handbook" lifecycle="filled">
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <Text size="body-lg">Questions about this handbook go to your manager or to HR.</Text>
        <Acknowledge role="employee" text="I have read and agree to the Employee Handbook" onSign={() => undefined} />
      </Document>
    </DocumentViewer>
  ),
};
