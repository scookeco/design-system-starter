import type { Meta, StoryObj } from '@storybook/react-vite';
import { Term } from '../Clause/Clause';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { DocumentTitle, Recital, Recitals } from './DocumentTitle';

const meta = {
  title: 'Components/DocumentTitle',
  component: DocumentTitle,
  args: { title: 'Master Services Agreement' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The title, number and preamble of an agreement, then its recitals. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <DocumentTitle title="Master Services Agreement" number="Agreement No. MSA-2026-0142">
          This Master Services Agreement (this <Term>Agreement</Term>) is entered into between Acme Corp (<Term>Provider</Term>)
          and Globex Inc. (<Term>Customer</Term>).
        </DocumentTitle>
        <Recitals whereas closing="in consideration of the mutual covenants set out below, the Parties agree as follows:">
          <Recital>Provider operates a cloud-based facilities management platform; and</Recital>
          <Recital>Customer wishes to obtain those services under one or more Order Forms;</Recital>
        </Recitals>
      </Document>
    </DocumentViewer>
  ),
};

/** An amendment: its first recital names the agreement it amends. */
export const Amendment: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Amendment No. 1">
        <DocumentTitle title="Amendment No. 1" number="to Master Services Agreement No. MSA-2026-0142">
          This Amendment No. 1 (this <Term>Amendment</Term>) is entered into as of 6 October 2026 between Acme Corp and Globex Inc.
        </DocumentTitle>
        <Recitals whereas closing="the Parties agree to amend the Agreement as follows:">
          <Recital>
            the Parties are parties to the Master Services Agreement No. MSA-2026-0142 dated 14 September 2026 (the <Term>Agreement</Term>);
          </Recital>
        </Recitals>
      </Document>
    </DocumentViewer>
  ),
};

/** Recitals lettered A., B. alone, with no “WHEREAS,” and no closing: the plain modern form. */
export const LetteredRecitals: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <DocumentTitle title="Master Services Agreement">
          This Agreement is between Acme Corp (<Term>Provider</Term>) and Globex Inc. (<Term>Customer</Term>).
        </DocumentTitle>
        <Recitals>
          <Recital>Customer wishes to obtain certain services from Provider.</Recital>
          <Recital>Provider is willing to provide them on the terms below.</Recital>
        </Recitals>
      </Document>
    </DocumentViewer>
  ),
};
