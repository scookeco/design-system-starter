import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '../Text/Text';
import { ReviewChanges, type ProposedChange } from './ReviewChanges';

const changes: ProposedChange[] = [
  { id: 'c1', target: 'Master cleaning agreement', field: 'Status', before: 'Overdue', after: 'Pending', reason: 'A signed renewal was added to its activity on 12 Sep.' },
  { id: 'c2', target: 'Office lease: Leeds', field: 'Status', before: 'Overdue', after: 'Pending', reason: 'Payment confirmed by the bank on 10 Sep.' },
  { id: 'c3', target: 'Security services', field: 'Status', before: 'Overdue', after: 'Active', reason: 'The renewal was approved on 9 Sep.' },
];
const text: ProposedChange = {
  id: 'c4',
  kind: 'text',
  target: 'Master cleaning agreement',
  field: 'Description',
  before: 'Covers cleaning for the office. Renews each year.',
  after: 'Covers cleaning and security for both offices. Renews each January unless cancelled.',
};
const blocked: ProposedChange = { id: 'c5', target: 'Parking permits 2025', field: 'Status', before: 'Archived', after: 'Pending', blockedReason: 'it’s archived. Restore it first.' };

const meta = {
  title: 'Components/ReviewChanges',
  component: ReviewChanges,
  args: {
    title: 'Proposed changes to 3 records',
    changes,
    onApply: () => undefined,
    onUndo: () => undefined,
    summary: <Text size="caption" tone="muted">Based on the 3 overdue records you can edit.</Text>,
  },
} satisfies Meta<typeof ReviewChanges>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing is decided yet, so nothing can be applied. */
export const Reviewing: Story = {};
export const PartlyDecided: Story = { args: { defaultDecisions: { c1: 'accepted', c2: 'rejected' } } };
export const TextRewrite: Story = { args: { title: 'Proposed rewrite', changes: [text], defaultDecisions: { c4: 'accepted' } } };
/** A change the person can't make says why, instead of offering Accept. */
export const WithBlockedChange: Story = { args: { changes: [...changes, blocked], defaultDecisions: { c1: 'accepted' } } };
export const Applying: Story = { args: { defaultDecisions: { c1: 'accepted', c2: 'accepted', c3: 'rejected' }, applying: true } };
export const Applied: Story = { args: { defaultDecisions: { c1: 'accepted', c2: 'accepted', c3: 'rejected' }, outcomes: { c1: { ok: true }, c2: { ok: true } } } };
export const PartlyFailed: Story = {
  args: {
    defaultDecisions: { c1: 'accepted', c2: 'accepted', c3: 'accepted' },
    outcomes: { c1: { ok: true }, c2: { ok: false, reason: 'someone else changed it' }, c3: { ok: true } },
  },
};
export const Undone: Story = { args: { defaultDecisions: { c1: 'accepted', c2: 'accepted' }, outcomes: { c1: { ok: true }, c2: { ok: true } }, undone: true } };
