import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { Menu } from './Menu';

const recordActions = [
  { label: 'Duplicate', icon: 'plus' },
  { label: 'Export as CSV', icon: 'download' },
  { label: 'Archive', disabled: true },
  'separator',
  { label: 'Delete record', tone: 'danger' },
] as const;

const meta = {
  title: 'Components/Menu',
  component: Menu,
  args: { trigger: <Button variant="secondary" icon="more">More</Button>, items: recordActions },
  // Room below the trigger, so the open menu fits inside the viewport screenshot.
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { tags: ['modal-open', '!autodocs'], args: { defaultOpen: true } };
/** Shortcuts at the end of each item, muted; the items get aria-keyshortcuts. The page registers the keys with useShortcut. */
export const WithShortcuts: Story = {
  tags: ['modal-open', '!autodocs'],
  args: {
    defaultOpen: true,
    items: [
      { label: 'Mark as read', shortcut: 'u' },
      { label: 'Archive', shortcut: 'e' },
      { label: 'Open command palette', shortcut: 'mod+k' },
      'separator',
      { label: 'Delete conversation', tone: 'danger', shortcut: '#' },
    ],
  },
};
export const AccountMenu: Story = {
  tags: ['modal-open', '!autodocs'],
  args: {
    defaultOpen: true,
    align: 'end',
    label: 'sam.rivera@example.com',
    trigger: (
      <Button variant="ghost">
        <Avatar name="Sam Rivera" size="sm" />
      </Button>
    ),
    items: [{ label: 'Profile' }, { label: 'Settings', icon: 'settings' }, 'separator', { label: 'Sign out' }],
  },
};
