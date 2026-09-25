import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './Heading';

const meta = {
  title: 'Components/Heading',
  component: Heading,
  args: { level: 1, children: 'Quarterly records' },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = {};
export const Level2: Story = { args: { level: 2 } };
export const Level3: Story = { args: { level: 3 } };
export const Level4: Story = { args: { level: 4 } };
export const Level2AtSize4: Story = { args: { level: 2, size: 4 } };
