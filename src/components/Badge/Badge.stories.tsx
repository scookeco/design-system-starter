import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'Active', tone: 'success' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};
export const Warning: Story = { args: { tone: 'warning', children: 'Expiring' } };
export const Danger: Story = { args: { tone: 'danger', children: 'Overdue' } };
export const Info: Story = { args: { tone: 'info', children: 'Pending' } };
export const Neutral: Story = { args: { tone: 'neutral', children: 'Draft' } };
export const WithDot: Story = { args: { indicator: 'dot' } };
export const DangerWithDot: Story = { args: { tone: 'danger', indicator: 'dot', children: 'Overdue' } };
export const TextOnly: Story = { args: { indicator: 'none', tone: 'info', children: 'Pending' } };
