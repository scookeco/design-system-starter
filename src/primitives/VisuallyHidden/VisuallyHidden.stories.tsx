import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './VisuallyHidden';

const meta = {
  title: 'Primitives/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: 'Trend:' },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Read as “Trend: up 12%”; the screen shows only “▲ 12%”. */
export const InlineText: Story = {
  render: (args) => (
    <p>
      <VisuallyHidden {...args} />
      <span aria-hidden="true">▲</span> <VisuallyHidden>up</VisuallyHidden> 12%
    </p>
  ),
};

export const BlockHeading: Story = {
  args: { as: 'div', children: <h2>Filters</h2> },
  render: (args) => (
    <>
      <VisuallyHidden {...args} />
      <p>The heading above is announced, not shown.</p>
    </>
  ),
};
