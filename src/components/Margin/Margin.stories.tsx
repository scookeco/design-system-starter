import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { ClauseNote } from '../ClauseNote/ClauseNote';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Margin } from './Margin';

const meta = {
  title: 'Components/Margin',
  component: Margin,
  args: { children: null },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Margin>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A clause's note in the end margin (Clause `note` puts it there), beside the paper on a wide viewer and under the heading on a narrow one. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Clause id="cap" title="Limitation of Liability" note={<ClauseNote position="seller-favored">Cap at 12 months of fees</ClauseNote>}>
          <Text size="body-lg">Each Party’s liability is capped at the fees paid in the prior twelve (12) months.</Text>
        </Clause>
      </Document>
    </DocumentViewer>
  ),
};

/** The start margin. */
export const StartSide: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Clause id="cap" title="Limitation of Liability">
          <Margin side="start">
            <ClauseNote source="DPA" color={2}>
              Library clause DPA-7
            </ClauseNote>
          </Margin>
          <Text size="body-lg">Each Party’s liability is capped at the fees paid in the prior twelve (12) months.</Text>
        </Clause>
      </Document>
    </DocumentViewer>
  ),
};
