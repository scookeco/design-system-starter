import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Stack } from '../../primitives/Stack/Stack';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { Divider } from './Divider';

const meta = {
  title: 'Components/Divider',
  component: Divider,
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <Stack gap="md">
      <Text>Billing contact and invoices.</Text>
      <Divider {...args} />
      <Text>Danger zone: delete this workspace.</Text>
    </Stack>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <Cluster gap="sm" align="center">
      <Button variant="ghost" size="sm">
        Bold
      </Button>
      <Button variant="ghost" size="sm">
        Italic
      </Button>
      <Divider {...args} />
      <Button variant="ghost" size="sm">
        Link
      </Button>
    </Cluster>
  ),
};

/** Not decorative: role="separator", announced between the two groups of controls. */
export const Semantic: Story = { ...Vertical, args: { orientation: 'vertical', decorative: false } };
