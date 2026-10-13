import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Callout } from './Callout';

const meta = {
  title: 'Components/Callout',
  component: Callout,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The three kinds, as a form uses them. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate">
        <Callout kind="instruction">Complete Steps 2 to 4 only if they apply to you; otherwise, skip to Step 5.</Callout>
        <Callout>Your employer keeps this form; you don’t send it to the tax authority.</Callout>
        <Callout kind="warning" title="Before you sign">
          <Text>Signing certifies that the information is correct. A false statement can be penalised.</Text>
        </Callout>
      </Document>
    </DocumentViewer>
  ),
};
