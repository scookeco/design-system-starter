import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { DocumentOption, DocumentRadioGroup } from './DocumentRadioGroup';

const meta = {
  title: 'Components/DocumentRadioGroup',
  component: DocumentRadioGroup,
  args: { name: 'filing_status', label: 'Filing status', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A W-4's filing status: one choice of three. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" lifecycle="filled" defaultValues={{ filing_status: 'single' }}>
        <DocumentRadioGroup name="filing_status" label="Filing status" required role="employee">
          <DocumentOption value="single">Single or Married filing separately</DocumentOption>
          <DocumentOption value="joint">Married filing jointly or Qualifying surviving spouse</DocumentOption>
          <DocumentOption value="hoh">Head of household</DocumentOption>
        </DocumentRadioGroup>
      </Document>
    </DocumentViewer>
  ),
};
