import type { Meta, StoryObj } from '@storybook/react-vite';
import { http } from 'msw';
import { aiHoldAfter, aiRateLimited } from '../app/mocks/ai';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { CreateWithAi } from './CreateWithAi';

const meta = {
  title: 'Examples/Create with AI',
  component: CreateWithAi,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
  args: { initialName: 'Office lease: Leeds' },
} satisfies Meta<typeof CreateWithAi>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing suggested yet: Suggest description sits beside the field, which works without it. */
export const Default: Story = {};
/** Arriving: ghost text with a caret-less "AI is suggesting…", and Stop. Accept waits for it to finish. */
export const Suggesting: Story = { tags: ['busy'], args: { initialSuggest: true }, parameters: mswOverrides(aiHoldAfter(6)) };
/** Complete: Tab or Accept takes it, Esc or Dismiss drops it. */
export const SuggestionReady: Story = { args: { initialSuggest: true } };
/** Accepted: marked "Drafted with AI" until edited, with Undo back to what was there. */
export const Accepted: Story = { args: { initialSuggest: true, initialAccept: true } };
export const RateLimited: Story = { args: { initialSuggest: true }, parameters: mswOverrides(aiRateLimited) };
/** A viewer can't create records, so the AI action is disabled with the reason, like any other. */
export const AsViewer: Story = { parameters: mockApi({ role: 'viewer' }) };
/** The server knows better than the client: a role changed mid-session and the suggestion is refused. */
export const Refused: Story = {
  args: { initialSuggest: true },
  parameters: mswOverrides(
    http.post('*/api/t/:tenant/ai/respond', () =>
      Response.json({ error: { code: 'forbidden', message: 'Your role in this workspace changed: you can no longer create records.' } }, { status: 403 }),
    ),
  ),
};
