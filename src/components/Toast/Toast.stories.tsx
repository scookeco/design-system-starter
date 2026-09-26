import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Toast, ToastProvider, useToast } from './Toast';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  // Open and never auto-dismissed, so the gallery and screenshots see a stable state.
  args: { title: 'Record created', description: 'Hardware lease was added as a draft.', tone: 'success', defaultOpen: true, duration: Infinity },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};
export const Warning: Story = { args: { tone: 'warning', title: 'Approaching limit', description: '90% of this month’s records used.' } };
export const Danger: Story = { args: { tone: 'danger', title: 'Could not save', description: 'Check your connection and try again.' } };
export const Info: Story = { args: { tone: 'info', title: 'Export started', description: undefined } };
export const Neutral: Story = { args: { tone: 'neutral', title: 'Filters cleared', description: undefined } };

/** A reversible change, confirmed with an Undo instead of an "Are you sure?" beforehand. */
export const WithAction: Story = {
  args: {
    tone: 'success',
    title: 'Record archived',
    description: 'Hardware lease',
    action: { label: 'Undo', altText: 'Find it under Archived to restore it.', onAction: () => undefined },
  },
};

function Trigger() {
  const toast = useToast();
  return <Button onClick={() => toast({ title: 'Saved', tone: 'success' })}>Show toast</Button>;
}

export const Imperative: Story = { render: () => <Trigger /> };
