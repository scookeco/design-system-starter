import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Banner } from './Banner';

const meta = {
  title: 'Components/Banner',
  component: Banner,
  args: { tone: 'info', children: 'Record exports are paused until 06:00 UTC while storage is upgraded.' },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Success: Story = { args: { tone: 'success', children: 'Notification preferences saved.' } };
export const Warning: Story = {
  args: { tone: 'warning', title: 'Seat limit almost reached', children: '48 of 50 seats are in use.', action: <Button variant="secondary" size="sm">Add seats</Button> },
};
export const Danger: Story = {
  args: { tone: 'danger', children: 'Imports from the finance system have stopped.', action: <Button variant="secondary" size="sm">Review import</Button> },
};
export const Dismissible: Story = { args: { onDismiss: () => undefined } };
export const Silent: Story = { args: { tone: 'danger', announce: false, title: 'There are 2 problems', children: 'Fix the highlighted fields.' } };
