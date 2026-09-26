import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Stack } from '../../primitives/Stack/Stack';
import { Avatar } from '../Avatar/Avatar';
import { Link } from '../Link/Link';
import { Text } from '../Text/Text';
import { HoverCard } from './HoverCard';

const meta = {
  title: 'Components/HoverCard',
  component: HoverCard,
  args: {
    trigger: <Link href="#people/priya">Priya Shah</Link>,
    children: (
      <Cluster gap="sm" align="start" wrap={false}>
        <Avatar name="Priya Shah" size="md" decorative />
        <Stack gap="2xs">
          <Text>Priya Shah</Text>
          <Text size="caption" tone="muted">
            Finance lead · Facilities and Operations
          </Text>
        </Stack>
      </Cluster>
    ),
  },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { tags: ['!autodocs'], args: { defaultOpen: true } };
export const OpenTop: Story = { tags: ['!autodocs'], args: { defaultOpen: true, side: 'top' }, parameters: { layout: 'centered' } };
