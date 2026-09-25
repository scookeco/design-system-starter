import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stat } from './Stat';

const meta = {
  title: 'Components/Stat',
  component: Stat,
  args: { label: 'Active records', value: '1,284' },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValueOnly: Story = {};
export const UpPositive: Story = { args: { delta: { value: '12%', direction: 'up', tone: 'positive' }, comparison: 'vs previous 30 days' } };
export const UpNegative: Story = {
  args: { label: 'Overdue records', value: '14', delta: { value: '3', direction: 'up', tone: 'negative' }, comparison: 'vs previous 30 days' },
};
export const DownPositive: Story = {
  args: { label: 'Pending approvals', value: '9', delta: { value: '25%', direction: 'down', tone: 'positive' }, comparison: 'vs previous 30 days' },
};
export const DownNeutral: Story = { args: { label: 'Records created', value: '86', delta: { value: '4%', direction: 'down' }, comparison: 'vs previous 30 days' } };
export const Flat: Story = { args: { label: 'Contract value', value: '$1.2M', delta: { value: '0%', direction: 'flat' }, comparison: 'vs previous 30 days' } };
