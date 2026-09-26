import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './Slider';

const meta = {
  title: 'Components/Slider',
  component: Slider,
  args: { label: 'Volume', defaultValue: [40], formatValue: (v: number) => `${String(v)}%` },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};
export const WithDescription: Story = { args: { description: 'Applies to notification sounds only.' } };
export const Range: Story = {
  args: { label: 'Price', defaultValue: [20, 80], min: 0, max: 200, step: 5, minStepsBetweenThumbs: 2, formatValue: (v: number) => `£${String(v)}` },
};
export const Stepped: Story = { args: { label: 'Seats', defaultValue: [5], min: 1, max: 20, step: 1, formatValue: (v: number) => `${String(v)} seats` } };
export const WithError: Story = { args: { label: 'Retention', defaultValue: [5], min: 0, max: 90, formatValue: (v: number) => `${String(v)} days`, error: 'Keep records for at least 7 days.' } };
export const Disabled: Story = { args: { disabled: true } };
