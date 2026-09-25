import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { Stepper } from './Stepper';

const steps = [{ label: 'Workspace' }, { label: 'Invite' }, { label: 'Plan' }, { label: 'Review' }];

const meta = {
  title: 'Components/Stepper',
  component: Stepper,
  args: { label: 'Setup steps', steps, current: 0 },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {};
export const MiddleStep: Story = { args: { current: 2 } };
export const LastStep: Story = { args: { current: 3 } };
export const AllCompleted: Story = { args: { current: 4 } };
export const Narrow: Story = {
  args: { current: 1, steps: [...steps, { label: 'Connect your calendar' }, { label: 'Import records' }] },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
