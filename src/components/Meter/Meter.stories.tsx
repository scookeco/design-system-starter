import type { Meta, StoryObj } from '@storybook/react-vite';
import { Meter } from './Meter';

const meta = {
  title: 'Components/Meter',
  component: Meter,
  args: { label: 'Seats', value: 23, max: 50, valueText: '23 of 50 seats' },
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithinLimit: Story = {};
export const Warning: Story = { args: { value: 42, valueText: '42 of 50 seats' } };
export const Danger: Story = { args: { label: 'API calls this month', value: 10000, max: 10000, valueText: '10,000 of 10,000 calls' } };
export const CustomThresholds: Story = {
  args: { label: 'Storage', value: 61, max: 100, valueText: '61 of 100 GB', warningAt: 60, dangerAt: 90 },
};
export const DefaultValueText: Story = { args: { label: 'Workflows', value: 3, max: 10, valueText: undefined } };
