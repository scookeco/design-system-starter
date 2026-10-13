import type { Meta, StoryObj } from '@storybook/react-vite';
import { Address } from '../Address/Address';
import { Avatar } from '../Avatar/Avatar';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Heading } from '../Heading/Heading';
import { Text } from '../Text/Text';
import { Letterhead } from './Letterhead';

const meta = {
  title: 'Components/Letterhead',
  component: Letterhead,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Letterhead>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An offer letter's letterhead: the issuer's mark, name and address, above the letter. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Offer letter" type="offer-letter">
        <Letterhead logo={<Avatar name="Acme Corp" size="lg" />}>
          <Heading level={2} size={4}>
            Acme Corp
          </Heading>
          <Address lines={['500 Pine Street', 'Seattle, WA 98101']} />
        </Letterhead>
        <Text size="body-lg">Dear Maya, we are pleased to offer you the role of Legal counsel.</Text>
      </Document>
    </DocumentViewer>
  ),
};
