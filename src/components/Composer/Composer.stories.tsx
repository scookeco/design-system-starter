import type { Meta, StoryObj } from '@storybook/react-vite';
import { Composer } from './Composer';

const meta = {
  title: 'Components/Composer',
  component: Composer,
  args: { label: 'Ask about this record', placeholder: 'Ask about this record…', onSend: () => undefined },
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithText: Story = { args: { defaultValue: 'Summarise the last three activity entries' } };
/** An answer is arriving: Stop replaces Send. */
export const Streaming: Story = { args: { streaming: true, onStop: () => undefined } };
export const WithAttachments: Story = {
  args: {
    onAttach: () => undefined,
    onRemoveAttachment: () => undefined,
    attachments: [
      { id: 'a1', name: 'Signed agreement.pdf' },
      { id: 'a2', name: 'Pricing schedule.xlsx' },
    ],
  },
};
export const NearLimit: Story = { args: { maxLength: 60, defaultValue: 'Summarise the renewal terms for the legal team' } };
export const OverLimit: Story = { args: { maxLength: 40, defaultValue: 'Summarise the renewal terms for the legal team, please' } };
export const Disabled: Story = { args: { disabled: true, note: 'You’ve used this month’s AI allowance. It resets on 1 October.' } };
