import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './Textarea';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  args: { label: 'Description (optional)', placeholder: 'What does this record cover?' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: 'Covers facilities maintenance, cleaning and security for both offices.' } };
export const WithDescription: Story = { args: { description: 'Shown to everyone with access to the record.' } };
export const WithError: Story = { args: { label: 'Reason', error: 'Tell reviewers why this record is changing.' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Locked while the record is waiting for approval.' } };
export const TallerRows: Story = { args: { rows: 8 } };
