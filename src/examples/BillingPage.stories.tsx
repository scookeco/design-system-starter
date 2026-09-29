import type { Meta, StoryObj } from '@storybook/react-vite';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { BillingPage } from './BillingPage';

const meta = {
  title: 'Examples/Billing and usage',
  component: BillingPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof BillingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The plan, usage against its limits (API calls nearing theirs, said in words), and invoices. */
export const Default: Story = { parameters: mockApi({ url: '/billing' }) };
/** Another workspace's currency: every amount follows it, in the reader's format. */
export const OtherCurrency: Story = { parameters: mockApi({ url: '/billing', tenant: 'globex' }) };
/** An editor sees the plan and invoices; Change plan is disabled, with the reason. */
export const AsEditor: Story = { parameters: mockApi({ url: '/billing', role: 'editor' }) };
/** The plans: Starter can't hold what's in use, so it's disabled with the reason. */
export const ChangePlan: Story = { tags: ['modal-open'], args: { initialDialogOpen: true, initialPlan: 'business' }, parameters: mockApi({ url: '/billing' }) };
/** Switching: pending until the server answers; the dialog stays. */
export const ChangePlanPending: Story = {
  tags: ['modal-open', 'busy'],
  args: { initialDialogOpen: true, initialPlan: 'business', initialSubmit: true },
  parameters: { ...mockApi({ url: '/billing' }), ...mswOverrides(hold('post', '/billing/plan')) },
};
/** The server refused (someone changed the plan first): nothing changed, and the dialog says so. */
export const ChangePlanRefused: Story = {
  tags: ['modal-open'],
  args: { initialDialogOpen: true, initialPlan: 'business', initialSubmit: true },
  parameters: { ...mockApi({ url: '/billing' }), ...mswOverrides(fail('post', '/billing/plan', 409, 'conflict', 'Someone else changed the plan since you opened this. Check it and try again.')) },
};
export const Loading: Story = { tags: ['busy'], parameters: { ...mockApi({ url: '/billing' }), ...mswOverrides(hold('get', '/billing')) } };
export const LoadError: Story = { parameters: { ...mockApi({ url: '/billing' }), ...mswOverrides(fail('get', '/billing')) } };
