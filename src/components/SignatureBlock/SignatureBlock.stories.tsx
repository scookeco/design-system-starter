import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { SignatureBlock, type SignatureRecipient } from './SignatureBlock';

const meta = {
  title: 'Components/SignatureBlock',
  component: SignatureBlock,
  args: { name: 'Maya Okafor', title: 'Legal counsel' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SignatureBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Waiting for its signer: a Sign tag and the tags the signer’s details fill. */
export const Unsigned: Story = {};

/** With onSign, the Sign tag is a button that starts the app’s signing flow. */
export const WithSignAction: Story = { args: { onSign: () => undefined } };

/** Signed: the signature drawn on its line, the values as plain text, everything in the place its tag held. */
export const Signed: Story = { args: { signature: 'Maya Okafor', date: '14 Oct 2026' } };

/** Before and after side by side: rows keep their position and spacing. */
export const BeforeAndAfter: Story = {
  render: (args) => (
    <Cluster gap="xl">
      <SignatureBlock {...args} />
      <SignatureBlock {...args} signature="Maya Okafor" date="14 Oct 2026" />
    </Cluster>
  ),
};

/** Each recipient has a colour, the same on every field they complete. */
export const Recipients: Story = {
  render: () => (
    <Cluster gap="xl">
      {([1, 2, 3, 4, 5, 6] as SignatureRecipient[]).map((recipient) => (
        <SignatureBlock key={recipient} name={`Recipient ${recipient}`} recipient={recipient} />
      ))}
    </Cluster>
  ),
};
