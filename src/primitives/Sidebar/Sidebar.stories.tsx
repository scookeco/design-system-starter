import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Sidebar } from './Sidebar';

const meta = {
  title: 'Primitives/Sidebar',
  component: Sidebar,
  args: { side: <DemoBox>Side region</DemoBox>, children: <DemoBox>Main content takes the remaining space.</DemoBox> },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Start: Story = {};
export const End: Story = { args: { placement: 'end' } };
export const NarrowSide: Story = { args: { sideWidth: 'sm', gap: 'md' } };
