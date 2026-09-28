import type { Meta, StoryObj } from '@storybook/react-vite';
import { Nav } from './Nav';
import { FileIcon, HomeIcon, SettingsIcon, UsersIcon } from '../Icon/icons';

const primary = [
  {
    items: [
      { label: 'Home', href: '/home', icon: HomeIcon },
      { label: 'Records', href: '/records', icon: FileIcon },
      { label: 'People', href: '/people', icon: UsersIcon },
    ],
  },
  { label: 'Workspace', items: [{ label: 'Settings', href: '/settings', icon: SettingsIcon }] },
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
