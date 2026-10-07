import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignatureBlock } from '../SignatureBlock/SignatureBlock';
import { SignaturePage, SignatureParty } from './SignaturePage';

const meta = {
  title: 'Components/SignaturePage',
  component: SignaturePage,
  args: { children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SignaturePage>;

export default meta;
type Story = StoryObj<typeof meta>;

const acme = (
  <SignatureParty name="Acme Corp">
    <SignatureBlock name="Maya Okafor" title="Legal counsel" recipient={3} />
  </SignatureParty>
);
const globex = (
  <SignatureParty name="Globex Inc.">
    <SignatureBlock name="Jon Park" title="Operations director" recipient={1} />
  </SignatureParty>
);
const escrow = (
  <SignatureParty name="Escrow Agent">
    <SignatureBlock name="Rita Alvarez" title="Trust officer" recipient={5} />
  </SignatureParty>
);

/** Two parties side by side: the usual bilateral agreement. */
export const TwoParties: Story = { render: () => <SignaturePage>{acme}{globex}</SignaturePage> };

/** One party keeps a column's width: a notice or a certificate. */
export const OneParty: Story = {
  render: () => <SignaturePage witness="IN WITNESS WHEREOF, the undersigned has executed this instrument by its duly authorized representative.">{acme}</SignaturePage>,
};

/** Three parties: the third moves to the second row, under the first (an escrow agreement). */
export const ThreeParties: Story = { render: () => <SignaturePage>{acme}{globex}{escrow}</SignaturePage> };
