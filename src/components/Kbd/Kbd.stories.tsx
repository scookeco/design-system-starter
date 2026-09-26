import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';

const meta = {
  title: 'Components/Kbd',
  component: Kbd,
  args: { children: 'Tab' },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleKey: Story = {};
/** A combination is one Kbd per key. */
export const Combination: Story = {
  render: () => (
    <p>
      Press <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line.
    </p>
  ),
};
