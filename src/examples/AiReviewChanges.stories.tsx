import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { aiHoldAfter } from '../app/mocks/ai';
import { seedRecords } from '../app/mocks/seed';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { AiReviewChanges } from './AiReviewChanges';

/** The first record the agent will propose to move: an overdue one with a renewal on file. */
const firstProposed = seedRecords('acme')
  .filter((r) => r.status === 'overdue' && r.tags.includes('renewal'))
  .sort((a, b) => a.name.localeCompare(b.name))[0];

const meta = {
  title: 'Examples/AI bulk changes',
  component: AiReviewChanges,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof AiReviewChanges>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before asking: the task, and the button that runs it. */
export const Ready: Story = {};
/** The agent is working: its steps so far, and its answer arriving. */
export const Proposing: Story = { tags: ['busy'], args: { initialRun: true }, parameters: mswOverrides(aiHoldAfter(8)) };
/** Proposed: each change as a diff with its reason; nothing is decided, so nothing can be applied. */
export const Proposed: Story = { args: { initialRun: true } };
/** Accepted and applied through moveRecord: each change's outcome, and Undo. */
export const Applied: Story = { args: { initialRun: true, initialApply: true } };
/** One record changed under the proposal: a 409 for it, the rest applied. */
export const PartlyFailed: Story = {
  args: { initialRun: true, initialApply: true },
  parameters: mswOverrides(
    http.post('*/api/t/:tenant/records/:id/status', ({ params }) =>
      params.id === firstProposed?.id ? HttpResponse.json({ error: { code: 'conflict', message: 'Someone else changed this record.' } }, { status: 409 }) : undefined,
    ),
  ),
};
/** Undone: every applied record moved back, with the version each move returned. */
export const Undone: Story = { args: { initialRun: true, initialApply: true, initialUndo: true } };
/** A viewer can't move records: the action is disabled with the reason. */
export const AsViewer: Story = { parameters: mockApi({ role: 'viewer' }) };
/** Asked anyway (from somewhere that didn't check): the agent refuses with the same reason, and proposes nothing. */
export const AsViewerRefused: Story = { args: { initialRun: true }, parameters: mockApi({ role: 'viewer' }) };
