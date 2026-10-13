import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Document } from '../Document/Document';
import type { DocumentValues } from '../Document/data';
import { Parties, Party, type PartyColor } from '../Parties/Parties';
import { SignatureBlock } from './SignatureBlock';

const meta = {
  title: 'Components/SignatureBlock',
  component: SignatureBlock,
  args: { role: 'customer' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SignatureBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What Maya Okafor's signing fills in: her adopted signature, the date, her name and title. */
const SIGNED: DocumentValues = {
  signature: { customer: 'Maya Okafor' },
  date_signed: { customer: '2026-10-14' },
  customer_signer_name: 'Maya Okafor',
  customer_signer_title: 'Legal counsel',
};

function Signing({ values, onSign, lifecycle = 'filled' }: { values?: DocumentValues; onSign?: () => void; lifecycle?: 'filled' | 'executed' }) {
  return (
    <Document label="Agreement" lifecycle={lifecycle} values={values ?? {}}>
      <Parties>
        <Party role="customer" name="Acme Corp" />
      </Parties>
      <SignatureBlock role="customer" onSign={onSign} />
    </Document>
  );
}

/** Waiting for its signer: a Sign tag and the tags the signer’s details fill, in the party's colour. */
export const Unsigned: Story = { render: () => <Signing /> };

/** With onSign, the Sign tag is a button that starts the app’s signing flow. */
export const WithSignAction: Story = { render: () => <Signing onSign={() => undefined} /> };

/** Signed: the signature drawn on its line, the values as plain text, everything in the place its tag held. */
export const Signed: Story = { render: () => <Signing values={SIGNED} lifecycle="executed" /> };

/** Before and after side by side: rows keep their position and spacing. */
export const BeforeAndAfter: Story = {
  render: () => (
    <Cluster gap="xl">
      <Signing />
      <Signing values={SIGNED} lifecycle="executed" />
    </Cluster>
  ),
};

/** Each party has a colour, the same on every field it completes: by declaration order, or set on Party. */
export const Recipients: Story = {
  render: () => (
    <Document label="Agreement">
      <Parties>
        {([1, 2, 3, 4, 5, 6] as PartyColor[]).map((color) => (
          <Party key={color} role={`party-${String(color)}`} name={`Recipient ${String(color)}`} color={color} />
        ))}
      </Parties>
      <Cluster gap="xl">
        {[1, 2, 3, 4, 5, 6].map((color) => (
          <SignatureBlock key={color} role={`party-${String(color)}`} />
        ))}
      </Cluster>
    </Document>
  ),
};
