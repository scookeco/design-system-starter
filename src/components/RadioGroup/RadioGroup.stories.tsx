import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup } from './RadioGroup';

const options = [
  { value: 'renew', label: 'Renews automatically', description: 'The term restarts unless someone cancels it.' },
  { value: 'end', label: 'Ends on the end date' },
  { value: 'monthly', label: 'Rolls month to month' },
];

const meta = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  args: { label: 'When the term ends', options },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};
export const Selected: Story = { args: { defaultValue: 'end' } };
export const WithDescription: Story = { args: { description: 'You can change this until the record is sent.' } };
export const WithError: Story = { args: { error: 'Choose what happens when the term ends.' } };
export const Horizontal: Story = {
  args: {
    label: 'Digest',
    orientation: 'horizontal',
    defaultValue: 'weekly',
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'never', label: 'Never' },
    ],
  },
};
export const DisabledOption: Story = { args: { defaultValue: 'renew', options: [...options.slice(0, 2), { value: 'monthly', label: 'Rolls month to month', disabled: true }] } };
export const Disabled: Story = { args: { defaultValue: 'renew', disabled: true } };
