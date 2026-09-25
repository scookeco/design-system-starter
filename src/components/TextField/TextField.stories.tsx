import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: 'Record name', placeholder: 'e.g. Annual services agreement' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'Hardware lease' } };
export const WithDescription: Story = { args: { description: 'Shown to everyone with access to the record.' } };
export const WithError: Story = { args: { defaultValue: '', error: 'Enter a name for the record.' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Locked value' } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const HiddenLabel: Story = { args: { label: 'Search records', hideLabel: true, type: 'search', placeholder: 'Search' } };
export const Password: Story = {
  args: { label: 'Password', type: 'password', autoComplete: 'current-password', defaultValue: 'correct horse', placeholder: undefined },
};
export const PasswordVisible: Story = { args: { ...Password.args, defaultPasswordVisible: true } };
