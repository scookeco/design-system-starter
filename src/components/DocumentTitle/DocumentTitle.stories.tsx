import type { Meta, StoryObj } from '@storybook/react-vite';
import { Term } from '../Clause/Clause';
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
    <DocumentViewer label="Master services agreement">
      <DocumentTitle title="Master Services Agreement" number="Agreement No. MSA-2026-0142">
        This Master Services Agreement (this “<Term define>Agreement</Term>”) is entered into between Acme Corp (“<Term define>Provider</Term>”)
        and Globex Inc. (“<Term define>Customer</Term>”).
      </DocumentTitle>
      <Recitals>
        <Recital>Provider operates a cloud-based facilities management platform; and</Recital>
        <Recital>Customer wishes to obtain those services under one or more Order Forms;</Recital>
      </Recitals>
    </DocumentViewer>
  ),
};

/** An amendment: its first recital names the agreement it amends. */
export const Amendment: Story = {
  render: () => (
    <DocumentViewer label="Amendment No. 1">
      <DocumentTitle title="Amendment No. 1" number="to Master Services Agreement No. MSA-2026-0142">
        This Amendment No. 1 (this “<Term define>Amendment</Term>”) is entered into as of 6 October 2026 between Acme Corp and Globex Inc.
      </DocumentTitle>
      <Recitals closing="the Parties agree to amend the Agreement as follows:">
        <Recital>
          the Parties are parties to the Master Services Agreement No. MSA-2026-0142 dated 14 September 2026 (the “<Term define>Agreement</Term>”);
        </Recital>
      </Recitals>
    </DocumentViewer>
  ),
};
