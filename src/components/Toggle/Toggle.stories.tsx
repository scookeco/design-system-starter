import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from '../Tooltip/Tooltip';
import { Toggle } from './Toggle';

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  args: { label: 'Show archived' },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unpressed: Story = {};
export const Pressed: Story = { args: { defaultPressed: true } };
export const WithIcon: Story = { args: { icon: 'eye', label: 'Preview', defaultPressed: true } };
export const Small: Story = { args: { size: 'sm' } };
export const IconOnly: Story = {
  args: { icon: 'menu', label: 'Compact rows', hideLabel: true },
  render: (args) => (
    <Tooltip content={args.label}>
      <Toggle {...args} />
    </Tooltip>
  ),
};
export const Disabled: Story = { args: { disabled: true } };
