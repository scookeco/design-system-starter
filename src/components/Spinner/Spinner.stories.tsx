import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  args: { label: 'Loading records' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standalone: Story = {};
export const StandaloneMedium: Story = { args: { size: 'md' } };
export const Decorative: Story = { args: { label: undefined } };
