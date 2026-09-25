import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Reel } from './Reel';

const items = (n: number) => Array.from({ length: n }, (_, i) => <DemoBox key={i}>Item {i + 1}</DemoBox>);

const meta = {
  title: 'Primitives/Reel',
  component: Reel,
  args: { label: 'Recent files', children: items(10) },
} satisfies Meta<typeof Reel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SmallItems: Story = { args: { itemWidth: 'sm', gap: 'sm' } };
export const LargeItems: Story = { args: { itemWidth: 'lg', gap: 'lg' } };
export const AutoWidth: Story = { args: { itemWidth: 'auto', children: ['Overdue', 'Due this week', 'Paid', 'Draft', 'Disputed', 'Written off', 'Refunded'].map((t) => <DemoBox key={t}>{t}</DemoBox>) } };
export const FitsWithoutScrolling: Story = { args: { children: items(2) } };
