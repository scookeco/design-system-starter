import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox, DemoNarrow } from '../../../.storybook/DemoBox';
import { Switcher } from './Switcher';

const meta = {
  title: 'Primitives/Switcher',
  component: Switcher,
  args: {
    children: (
      <>
        <DemoBox>One</DemoBox>
        <DemoBox>Two</DemoBox>
        <DemoBox>Three</DemoBox>
        <DemoBox>Four</DemoBox>
      </>
    ),
  },
} satisfies Meta<typeof Switcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Row: Story = {};
export const ColumnWhenNarrow: Story = {
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
export const LowThresholdStaysARow: Story = { ...ColumnWhenNarrow, args: { threshold: 'xs', gap: 'sm' } };
