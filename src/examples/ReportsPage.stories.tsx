import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { DemoNarrow } from '../../.storybook/DemoBox';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { ReportsPage } from './ReportsPage';

const meta = {
  title: 'Examples/Reports',
  component: ReportsPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof ReportsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three questions, three charts: each says its answer in words, and its numbers are one click away. */
export const Default: Story = { parameters: mockApi({ url: '/reports' }) };
/** Every chart's table open: the text alternative, with the exact numbers. */
export const NumbersShown: Story = { args: { initialNumbersOpen: true }, parameters: mockApi({ url: '/reports' }) };
/** Twelve months of renewals: the horizon is in the URL. */
export const TwelveMonths: Story = { parameters: mockApi({ url: '/reports?horizon=12' }) };
/** A viewer's report has no drafts: the server aggregates only what they may see. */
export const AsViewer: Story = { parameters: mockApi({ url: '/reports', role: 'viewer' }) };
/** Another workspace, another currency (EUR): amounts follow it, formatted for the reader. */
export const OtherWorkspace: Story = { parameters: mockApi({ url: '/reports', tenant: 'globex' }) };
export const NothingToReport: Story = {
  parameters: {
    ...mockApi({ url: '/reports' }),
    ...mswOverrides(
      http.get('*/api/t/:tenant/reports', () =>
        HttpResponse.json({
          byStatus: ['draft', 'pending', 'active', 'overdue'].map((status) => ({ status, count: 0 })),
          byAccount: [],
          otherAccounts: { value: { minor: 0, currency: 'USD' }, records: 0, accounts: 0 },
          renewals: [],
          horizon: 6,
        }),
      ),
    ),
  },
};
export const Loading: Story = { tags: ['busy'], parameters: { ...mockApi({ url: '/reports' }), ...mswOverrides(hold('get', '/reports')) } };
export const LoadError: Story = { parameters: { ...mockApi({ url: '/reports' }), ...mswOverrides(fail('get', '/reports')) } };
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
  parameters: mockApi({ url: '/reports' }),
};
