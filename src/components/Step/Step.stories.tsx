import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document, DocumentGrid, DocumentPage } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Step } from './Step';

const meta = {
  title: 'Components/Step',
  component: Step,
  args: { title: 'Enter personal information' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Step>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A form page's steps placed on its grid: numbered by the document, one optional, and Step 5 fixed by the form. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" type="w-4" shell="grid" headingLevel={3}>
        <DocumentPage n={1}>
          <DocumentGrid cols={12}>
            <Step title="Enter personal information" area={{ row: 1, column: 1, columnSpan: 12 }} />
            <Step title="Multiple jobs or spouse works" optional area={{ row: 3, column: 1, columnSpan: 12 }}>
              <Text>Complete this step if you hold more than one job at a time.</Text>
            </Step>
            <Step title="Sign here" n={5} area={{ row: 6, column: 1, columnSpan: 12 }} />
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};
