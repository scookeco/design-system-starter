import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Grid } from './Grid';

const meta = {
  title: 'Primitives/Grid',
  component: Grid,
  args: { min: 'md', gap: 'md', children: Array.from({ length: 7 }, (_, i) => <DemoBox key={i}>{`Card ${String(i + 1)}`}</DemoBox>) },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SmallItems: Story = { args: { min: 'sm' } };
export const LargeItems: Story = { args: { min: 'lg', gap: 'lg' } };
