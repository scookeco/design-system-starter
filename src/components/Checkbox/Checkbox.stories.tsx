import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { label: 'Include drafts' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Indeterminate: Story = { args: { checked: 'indeterminate', label: 'Select all' } };
export const WithDescription: Story = { args: { description: 'Drafts are only visible to their owner.' } };
export const Disabled: Story = { args: { disabled: true } };
export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };
/** In a table row: the name ("Select Hardware lease") is for assistive tech; the row shows what it is. */
export const HiddenLabel: Story = { args: { label: 'Select Hardware lease', hideLabel: true, defaultChecked: true } };
