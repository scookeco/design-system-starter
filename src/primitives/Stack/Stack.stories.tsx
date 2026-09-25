import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox } from '../../../.storybook/DemoBox';
import { Stack } from './Stack';

const meta = {
  title: 'Primitives/Stack',
  component: Stack,
  args: {
    gap: 'md',
    children: (
      <>
        <DemoBox>First</DemoBox>
        <DemoBox>Second</DemoBox>
        <DemoBox>Third</DemoBox>
      </>
    ),
  },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const GapExtraSmall: Story = { args: { gap: 'xs' } };
export const GapExtraLarge: Story = { args: { gap: 'xl' } };
export const AlignCenter: Story = { args: { align: 'center' } };
