import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document, DocumentGrid, DocumentPage } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { DocumentField } from './DocumentField';

const meta = {
  title: 'Components/DocumentField',
  component: DocumentField,
  args: { name: 'customer', label: 'Customer' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentField>;

export default meta;
type Story = StoryObj<typeof meta>;

const VALUES = { customer: 'Globex Inc.', fee: 1250000, start: '2026-11-01', term: '24 months' };

function Order({ lifecycle }: { lifecycle: 'generated' | 'filled' }) {
  return (
    <DocumentViewer>
      <Document label="Order form" lifecycle={lifecycle} defaultValues={lifecycle === 'generated' ? VALUES : {}}>
        <Text size="body-lg">
          <DocumentField name="customer" label="Customer" /> orders the Services for <DocumentField name="fee" label="Annual fee" type="currency" />, starting{' '}
          <DocumentField name="start" label="Start date" type="date" /> for <DocumentField name="term" label="Initial term" type="duration" />. Purchase order:{' '}
          <DocumentField name="po" label="Purchase order number" />.
        </Text>
      </Document>
    </DocumentViewer>
  );
}

/** Generated: values merged from data read as the document's own text, formatted for their type; an empty one is a blank line. */
export const Default: Story = { render: () => <Order lifecycle="generated" /> };

/** Filled: each is an input in the line of text, named by its label. */
export const Fillable: Story = { render: () => <Order lifecycle="filled" /> };

/** On a form page: labels shown above each box, placed on the grid. */
export const OnAFormPage: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" type="w-4" lifecycle="filled" shell="grid" headingLevel={3}>
        <DocumentPage>
          <DocumentGrid cols={12}>
            <DocumentField name="first_name" label="First name and middle initial" showLabel required role="employee" area={{ row: 1, column: 1, rowSpan: 2, columnSpan: 5 }} />
            <DocumentField name="last_name" label="Last name" showLabel required role="employee" area={{ row: 1, column: 6, rowSpan: 2, columnSpan: 4 }} />
            <DocumentField name="ssn" label="Social security number" type="ssn" showLabel required role="employee" area={{ row: 1, column: 10, rowSpan: 2, columnSpan: 3 }} />
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};
