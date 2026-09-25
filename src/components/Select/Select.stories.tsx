import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select';

const options = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'archived', label: 'Archived', disabled: true },
];

const meta = {
  title: 'Components/Select',
  component: Select,
  args: { label: 'Status', options },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
export const WithValue: Story = { args: { defaultValue: 'pending' } };
export const WithDescription: Story = { args: { description: 'Who can see this record depends on its status.' } };
export const WithError: Story = { args: { error: 'Choose a status.' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'active' } };
export const Small: Story = { args: { size: 'sm', defaultValue: 'active' } };
export const Large: Story = { args: { size: 'lg', defaultValue: 'active' } };
export const Open: Story = { tags: ['modal-open', '!autodocs'], args: { defaultOpen: true, defaultValue: 'pending' } };
