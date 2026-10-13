import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause, ClauseRef } from '../Clause/Clause';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Heading } from '../Heading/Heading';
import { Text } from '../Text/Text';
import { Document, DocumentFlow, DocumentGrid, DocumentPage } from './Document';

const meta = {
  title: 'Components/Document',
  component: Document,
  args: { label: 'Master services agreement', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Document>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The clauses every flow story shows. */
function Clauses() {
  return (
    <DocumentFlow>
      <Clause id="term" title="Term">
        <Text size="body-lg">
          This Agreement begins on the Effective Date and continues for twenty-four (24) months, subject to <ClauseRef to="termination" />.
        </Text>
      </Clause>
      <Clause id="termination" title="Termination">
        <Text size="body-lg">Either Party may terminate for material breach not cured within thirty (30) days of written notice.</Text>
      </Clause>
    </DocumentFlow>
  );
}

/** A flow document: clauses reflow as one continuous sheet on screen; the signature page starts a new page only in print. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement" type="msa" version="3.2" lifecycle="negotiated">
        <Clauses />
        <DocumentPage>
          <Text size="body-lg">IN WITNESS WHEREOF, the Parties have executed this Agreement.</Text>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};

/** The same document without a viewer: what prints. No canvas or sheet, just the document's own layout. */
export const WithoutViewer: Story = {
  render: () => (
    <Document label="Master services agreement" type="msa">
      <Clauses />
    </Document>
  ),
};

/** A grid document: a fixed letter page, on screen too, with a 12-column grid its boxes are placed on. */
export const GridPage: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" type="w-4" version="2026" lifecycle="filled" shell="grid" headingLevel={3}>
        <DocumentPage n={1}>
          <DocumentGrid cols={2}>
            <Heading level={2} size={3}>
              Form W-4
            </Heading>
            <Text>Step 1: Enter personal information</Text>
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};

/** A landscape form page: the page's sides swap. */
export const GridPageLandscape: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Inspection checklist" type="inspection" shell="grid" headingLevel={3}>
        <DocumentPage orientation="landscape" n={1}>
          <DocumentGrid cols={12} rows={4}>
            <Heading level={2} size={3}>
              Safety inspection
            </Heading>
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};
