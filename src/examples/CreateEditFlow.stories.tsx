import type { Meta, StoryObj } from '@storybook/react-vite';
import { CreateEditFlow } from './CreateEditFlow';

const valid = { name: 'Hardware lease', owner: 'operations', amount: '12500', renewal: 'end' };

const meta = {
  title: 'Examples/Create and edit',
  component: CreateEditFlow,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CreateEditFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Valid: Story = { args: { initialDraft: valid } };
export const Invalid: Story = { args: { initialDraft: { name: 'Hardware lease' }, initialSubmitted: true } };
export const Submitting: Story = { args: { initialDraft: valid, initialSubmitting: true } };
export const QuickCreateOpen: Story = { tags: ['modal-open'], args: { initialQuickCreateOpen: true } };
