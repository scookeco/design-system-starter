import type { Meta, StoryObj } from '@storybook/react-vite';
import { Nav } from './Nav';

const primary = [
  {
    items: [
      { label: 'Home', href: '/home', icon: 'home' },
      { label: 'Records', href: '/records', icon: 'file' },
      { label: 'People', href: '/people', icon: 'users' },
    ],
  },
  { label: 'Workspace', items: [{ label: 'Settings', href: '/settings', icon: 'settings' }] },
] as const;

const settings = [
  {
    label: 'Personal',
    items: [
      { label: 'Profile', href: '/settings/profile' },
      { label: 'Notifications', href: '/settings/notifications' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'General', href: '/settings/general' },
      { label: 'Members', href: '/settings/members' },
    ],
  },
];

const meta = {
  title: 'Components/Nav',
  component: Nav,
  args: { label: 'Main', sections: primary, current: '/records' },
} satisfies Meta<typeof Nav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcons: Story = {};
export const NoCurrentPage: Story = { args: { current: undefined } };
export const GroupedSubNav: Story = { args: { label: 'Settings', sections: settings, current: '/settings/notifications' } };
