import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyButton } from './CopyButton';

const meta = {
  title: 'Components/CopyButton',
  component: CopyButton,
  args: { text: 'wsk_3f9a1c7e20b4', accessibleName: 'Copy API key' },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Secondary: Story = {};
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Medium: Story = { args: { size: 'md' } };
export const CustomLabels: Story = { args: { label: 'Copy link', accessibleName: undefined, copiedLabel: 'Link copied', text: 'https://example.com/share/8f2k' } };
