import type { Meta, StoryObj } from '@storybook/react-vite';
import { aiContentFiltered, aiHoldAfter, aiNetworkDropped, aiRateLimited } from '../app/mocks/ai';
import { mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { RecordCopilot } from './RecordCopilot';

const meta = {
  title: 'Examples/Record copilot',
  component: RecordCopilot,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof RecordCopilot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing asked yet: suggested questions. */
export const Empty: Story = {};
/** An answer that cites the record's fields and activity, with the tool activity collapsed above it. */
export const Answered: Story = { args: { initialPrompt: 'When does this renew?' } };
export const Summary: Story = { args: { initialPrompt: 'Summarise this record' } };
/** Mid-answer, pinned: the first words, the caret, and Stop in the composer. */
export const Streaming: Story = { tags: ['busy'], args: { initialPrompt: 'Summarise this record' }, parameters: mswOverrides(aiHoldAfter(8)) };
/** Stopped by the person: what arrived stays, with Retry. */
export const Stopped: Story = { args: { initialPrompt: 'Summarise this record', initialStopAfter: 8 }, parameters: mswOverrides(aiHoldAfter(8)) };
/** Outside its scope: a one-line refusal, not a guess. */
export const Refusal: Story = { args: { initialPrompt: 'What’s the weather in Leeds?' } };
export const RateLimited: Story = { args: { initialPrompt: 'When does this renew?' }, parameters: mswOverrides(aiRateLimited) };
export const ContentFiltered: Story = { args: { initialPrompt: 'Summarise this record' }, parameters: mswOverrides(aiContentFiltered) };
export const ConnectionDropped: Story = { args: { initialPrompt: 'Summarise this record' }, parameters: mswOverrides(aiNetworkDropped) };
/** Closed to its launcher: the record page takes the width back. */
export const PanelClosed: Story = { args: { defaultOpen: false } };
