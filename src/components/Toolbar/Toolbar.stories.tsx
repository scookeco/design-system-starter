import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toolbar, ToolbarButton, ToolbarSeparator } from './Toolbar';

const meta = {
  title: 'Components/Toolbar',
  component: Toolbar,
  args: {
    label: 'Conversation actions',
    children: (
      <>
        <ToolbarButton icon="archive" shortcut="e">
          Archive
        </ToolbarButton>
        <ToolbarButton shortcut="u">Mark as unread</ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton icon="download" hideLabel>
          Export
        </ToolbarButton>
        <ToolbarButton icon="copy" hideLabel disabled>
          Copy link
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton tone="danger">Delete</ToolbarButton>
      </>
    ),
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One tab stop; ← → move between buttons. Icon-only buttons name themselves in a tooltip. */
export const Default: Story = {};
export const Toggles: Story = {
  args: {
    label: 'Filters',
    children: (
      <>
        <ToolbarButton pressed>Unread only</ToolbarButton>
        <ToolbarButton pressed={false}>Mentions</ToolbarButton>
      </>
    ),
  },
};
export const Vertical: Story = { args: { orientation: 'vertical' } };
