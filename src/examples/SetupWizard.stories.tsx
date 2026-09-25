import type { Meta, StoryObj } from '@storybook/react-vite';
import { SetupWizard } from './SetupWizard';

const answers = { name: 'Acme Legal', address: 'acme-legal', invites: 'priya@example.com, jo@example.com', plan: 'team' };

const meta = {
  title: 'Examples/Setup wizard',
  component: SetupWizard,
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SetupWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {};
export const StepErrors: Story = { args: { initialDraft: { name: '', address: 'Acme Legal' }, initialAttempted: true } };
export const PlanStep: Story = { args: { initialStep: 2, initialDraft: answers } };
export const Review: Story = { args: { initialStep: 3, initialDraft: answers } };
