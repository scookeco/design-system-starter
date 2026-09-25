import type { Meta, StoryObj } from '@storybook/react-vite';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const meta = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  args: { label: 'Date range', options, defaultValue: '30d' },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VisibleLabel: Story = {};
export const HiddenLabel: Story = { args: { hideLabel: true } };
export const FirstSelected: Story = { args: { defaultValue: '7d' } };
export const TwoOptions: Story = {
  args: {
    label: 'Density',
    options: [
      { value: 'comfortable', label: 'Comfortable' },
      { value: 'compact', label: 'Compact' },
    ],
    defaultValue: 'compact',
  },
};
