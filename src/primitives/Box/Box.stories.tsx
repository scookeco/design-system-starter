import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox, DemoOutline } from '../../../.storybook/DemoBox';
import { Box } from './Box';

const meta = {
  title: 'Primitives/Box',
  component: Box,
  args: { children: <DemoBox>Content</DemoBox> },
  // The outline shows the padding the box adds around its content.
  decorators: [
    (Story) => (
      <DemoOutline>
        <Story />
      </DemoOutline>
    ),
  ],
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { padding: 'sm' } };
export const ExtraLarge: Story = { args: { padding: 'xl' } };
export const AxisOverrides: Story = { args: { padding: 'lg', paddingBlock: 'xs' } };
