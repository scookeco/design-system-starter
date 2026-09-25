import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Center } from './Center';

const meta = {
  title: 'Primitives/Center',
  component: Center,
  args: { max: 'sm', gutters: 'md', children: <DemoBox>Content is bounded to a readable measure and centred.</DemoBox> },
} satisfies Meta<typeof Center>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Intrinsic: Story = { args: { intrinsic: true, children: <DemoBox>Short centred message</DemoBox> } };
export const WideMeasure: Story = { args: { max: 'lg' } };
