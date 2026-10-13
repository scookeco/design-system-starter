import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { DocumentFieldset } from './DocumentFieldset';

const meta = {
  title: 'Components/DocumentFieldset',
  component: DocumentFieldset,
  args: { legend: 'Employers only', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentFieldset>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The employer's part of a W-4: every field in it is the employer's to fill. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" lifecycle="filled">
        <DocumentFieldset legend="Employers only" role="employer">
          <DocumentField name="employer_name" label="Employer’s name and address" showLabel required />
          <DocumentField name="first_date" label="First date of employment" type="date" showLabel required />
          <DocumentField name="ein" label="Employer identification number (EIN)" type="ein" showLabel required />
        </DocumentFieldset>
      </Document>
    </DocumentViewer>
  ),
};
