import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Toc } from '../Toc/Toc';
import { DocumentSection } from './DocumentSection';

const meta = {
  title: 'Components/DocumentSection',
  component: DocumentSection,
  args: { id: 'leave', title: 'Leave and time off', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A handbook: chapters are sections (titled, not numbered); the rules inside are clauses. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee handbook" type="handbook">
        <Toc />
        <DocumentSection id="leave" title="Leave and time off">
          <Clause id="vacation" title="Vacation">
            <Text size="body-lg">Twenty (20) days a year, accrued monthly.</Text>
          </Clause>
          <Clause id="sick" title="Sick leave">
            <Text size="body-lg">Ten (10) days a year.</Text>
          </Clause>
        </DocumentSection>
        <DocumentSection id="conduct" title="Conduct">
          <Clause id="gifts" title="Gifts">
            <Text size="body-lg">Gifts over a nominal value are declared.</Text>
          </Clause>
        </DocumentSection>
      </Document>
    </DocumentViewer>
  ),
};

/** Numbered: a section that is a clause. */
export const Numbered: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Security policy" type="policy">
        <DocumentSection id="scope" title="Scope" numbered>
          <Text size="body-lg">This policy applies to all staff and contractors.</Text>
        </DocumentSection>
        <DocumentSection id="access" title="Access control" numbered>
          <Text size="body-lg">Access is granted on least privilege.</Text>
        </DocumentSection>
      </Document>
    </DocumentViewer>
  ),
};
