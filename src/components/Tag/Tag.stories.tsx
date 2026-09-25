import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './Tag';

const meta = {
  title: 'Components/Tag',
  component: Tag,
  args: { children: 'Status: Overdue' },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {};
export const Removable: Story = { args: { onRemove: () => undefined } };
export const LongValue: Story = { args: { children: 'Owner: Facilities and Operations', onRemove: () => undefined } };
