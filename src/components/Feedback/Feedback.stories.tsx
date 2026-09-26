import type { Meta, StoryObj } from '@storybook/react-vite';
import { Feedback } from './Feedback';

const meta = {
  title: 'Components/Feedback',
  component: Feedback,
  args: { onFeedback: () => undefined },
} satisfies Meta<typeof Feedback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotRated: Story = {};
export const RatedHelpful: Story = { args: { defaultValue: { rating: 'up' } } };
export const RatedNotHelpful: Story = { args: { defaultValue: { rating: 'down', reason: 'Not accurate' } } };
export const CustomReasons: Story = { args: { reasons: ['Wrong record', 'Out of date', 'Something else'], label: 'Rate this summary' } };
