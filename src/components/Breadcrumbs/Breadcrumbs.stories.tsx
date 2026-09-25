import type { Meta, StoryObj } from '@storybook/react-vite';
import { Breadcrumbs } from './Breadcrumbs';

const meta = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  args: { items: [{ label: 'Records', href: '/records' }], current: 'Annual services agreement' },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneAncestor: Story = {};
export const DeepTrail: Story = {
  args: {
    items: [
      { label: 'Settings', href: '/settings' },
      { label: 'Workspace', href: '/settings/workspace' },
      { label: 'Members', href: '/settings/members' },
    ],
    current: 'Invite member',
  },
};
