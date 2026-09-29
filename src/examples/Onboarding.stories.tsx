import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { DashboardPage } from './DashboardPage';

const onboarding = (done: readonly boolean[], dismissed = false) =>
  mswOverrides(
    http.get('*/api/t/:tenant/onboarding', () =>
      HttpResponse.json({ steps: (['invite', 'import', 'connect'] as const).map((id, i) => ({ id, done: done[i] ?? false })), dismissed }),
    ),
  );

const meta = {
  title: 'Examples/Onboarding',
  component: DashboardPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Home for someone setting the workspace up: two of three steps done, worked out from the workspace itself. */
export const Checklist: Story = { parameters: mockApi({ url: '/home' }) };
/** A new workspace: nothing done yet, each step a link to where it's done. */
export const NothingDone: Story = { parameters: { ...mockApi({ url: '/home' }), ...onboarding([false, false, false]) } };
export const AllDone: Story = { parameters: { ...mockApi({ url: '/home' }), ...onboarding([true, true, true]) } };
/** Dismissed: gone from the top, with the way back at the bottom of Home. */
export const Dismissed: Story = { parameters: { ...mockApi({ url: '/home' }), ...onboarding([true, false, true], true) } };
/** An editor doesn't set the workspace up, so there's no checklist (and nothing is fetched for it). */
export const AsEditor: Story = { parameters: mockApi({ url: '/home', role: 'editor' }) };
export const Loading: Story = { tags: ['busy'], parameters: { ...mockApi({ url: '/home' }), ...mswOverrides(hold('get', '/onboarding')) } };
/** The checklist failed to load: it stays out of the way, and Home still works. */
export const LoadError: Story = { parameters: { ...mockApi({ url: '/home' }), ...mswOverrides(fail('get', '/onboarding')) } };
