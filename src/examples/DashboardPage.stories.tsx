import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../.storybook/DemoBox';
import { DashboardPage } from './DashboardPage';

const meta = {
  title: 'Examples/Dashboard',
  component: DashboardPage,
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LastSevenDays: Story = { args: { initialRange: '7d' } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
