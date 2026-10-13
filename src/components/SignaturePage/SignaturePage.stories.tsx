import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Parties, Party } from '../Parties/Parties';
import { SignaturePage, SignatureParty } from './SignaturePage';

const meta = {
  title: 'Components/SignaturePage',
  component: SignaturePage,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SignaturePage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The parties every story declares, in the colours each signs in. */
const PARTIES = (
  <Parties>
    <Party role="provider" name="Acme Corp" color={3} />
    <Party role="customer" name="Globex Inc." color={1} />
    <Party role="escrow" name="Escrow Agent" color={5} kind="signer" order={2} />
  </Parties>
);
const acme = <SignatureParty role="provider" />;
const globex = <SignatureParty role="customer" />;
const escrow = <SignatureParty role="escrow" />;

/** Two parties side by side: the usual bilateral agreement. */
export const TwoParties: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        {PARTIES}
        <SignaturePage>
          {acme}
          {globex}
        </SignaturePage>
      </Document>
    </DocumentViewer>
  ),
};

/** One party keeps a column's width: a notice or a certificate. */
export const OneParty: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Certificate">
        {PARTIES}
        <SignaturePage witness="IN WITNESS WHEREOF, the undersigned has executed this instrument by its duly authorized representative.">{acme}</SignaturePage>
      </Document>
    </DocumentViewer>
  ),
};

/** Three parties: the third moves to the second row, under the first (an escrow agreement). */
export const ThreeParties: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Escrow agreement">
        {PARTIES}
        <SignaturePage>
          {acme}
          {globex}
          {escrow}
        </SignaturePage>
      </Document>
    </DocumentViewer>
  ),
};
