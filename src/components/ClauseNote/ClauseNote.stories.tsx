import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '../../primitives/Stack/Stack';
import { Clause } from '../Clause/Clause';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { ClauseNote } from './ClauseNote';

const meta = {
  title: 'Components/ClauseNote',
  component: ClauseNote,
  args: { position: 'balanced' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ClauseNote>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The three negotiation positions, and a source in its contract type's colour. */
export const Kinds: Story = {
  render: () => (
    <Stack gap="lg">
      <ClauseNote position="balanced">Cap at the fees of the prior 12 months, for both Parties</ClauseNote>
      <ClauseNote position="seller-favored">Provider may name Customer without asking first</ClauseNote>
      <ClauseNote position="buyer-favored">Customer gets any better price Provider offers</ClauseNote>
      <ClauseNote source="DPA" color={5}>
        Clause library: DPA · Sub-processors
      </ClauseNote>
    </Stack>
  ),
};

/** On clauses: in the margin when the viewer is wide (75rem and up), under the heading when it is not, as here. */
export const OnClauses: Story = {
  render: () => (
    <DocumentViewer label="Master services agreement">
      <Clause id="liability" title="Limitation of Liability" note={<ClauseNote position="balanced">Cap at the fees of the prior 12 months</ClauseNote>} conspicuous>
        <Text size="body-lg">Each Party’s total aggregate liability will not exceed the fees paid in the twelve (12) months before the claim.</Text>
      </Clause>
      <Clause id="publicity" title="Publicity" note={<ClauseNote position="seller-favored">Provider may name Customer without asking first</ClauseNote>}>
        <Text size="body-lg">Provider may use Customer’s name and logo in its customer lists.</Text>
      </Clause>
    </DocumentViewer>
  ),
};
