import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContextMenu } from './ContextMenu';

const meta = {
  title: 'Components/ContextMenu',
  component: ContextMenu,
  args: {
    label: 'Northwind renewal',
    items: [
      { label: 'Open', shortcut: 'enter' },
      { label: 'Mark as unread', shortcut: 'u' },
      { label: 'Archive', icon: 'archive', shortcut: 'e' },
      'separator',
      { label: 'Delete', tone: 'danger' },
    ],
    children: (
      <div tabIndex={0} role="group" aria-label="Northwind renewal (right-click or Shift+F10 for actions)">
        Right-click here, or focus it and press Shift+F10.
      </div>
    ),
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
