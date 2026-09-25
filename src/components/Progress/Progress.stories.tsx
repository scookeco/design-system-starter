import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from './Progress';

const meta = {
  title: 'Components/Progress',
  component: Progress,
  args: { label: 'Setup progress', value: 2, max: 4, valueText: 'Step 2 of 4' },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Steps: Story = {};
export const Percentage: Story = { args: { label: 'Uploading contract.pdf', value: 64, max: 100, valueText: undefined } };
export const NotStarted: Story = { args: { value: 0, valueText: 'Step 0 of 4' } };
export const Complete: Story = { args: { value: 4, valueText: 'Step 4 of 4' } };
