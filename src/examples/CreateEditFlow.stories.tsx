import type { Meta, StoryObj } from '@storybook/react-vite';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { CreateEditFlow } from './CreateEditFlow';
import { Guard } from './Permission';

const valid = { name: 'Hardware lease', owner: 'acme-p02', amount: '12500', renewal: 'end' };

const meta = {
  title: 'Examples/Create and edit',
  component: CreateEditFlow,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof CreateEditFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Valid: Story = { args: { initialDraft: valid } };
export const Invalid: Story = { args: { initialDraft: { name: 'Hardware lease' }, initialSubmitted: true } };
/** Pessimistic create: the button carries the pending state until the server answers. */
export const Submitting: Story = { tags: ['busy'], args: { initialDraft: valid, initialSubmitting: true }, parameters: mswOverrides(hold('post', '/records')) };
export const Created: Story = { args: { initialDraft: valid, initialSubmitting: true } };
/** The server failed: the draft stays, and a retry reuses the idempotency key. */
export const CreateFailed: Story = { args: { initialDraft: valid, initialSubmitting: true }, parameters: mswOverrides(fail('post', '/records')) };
export const QuickCreateOpen: Story = { tags: ['modal-open'], args: { initialQuickCreateOpen: true } };

/**
 * The route guard for a viewer: the page is replaced by the 403 page, from the same `can` the New
 * record button and the create mutation use. Nothing on it queries, so it isn't a data story.
 */
export const AsViewerDenied: Story = {
  tags: ['!data'],
  parameters: mockApi({ role: 'viewer' }),
  render: (args) => (
    <Guard capability="record:create" current="/records">
      <CreateEditFlow {...args} />
    </Guard>
  ),
};

