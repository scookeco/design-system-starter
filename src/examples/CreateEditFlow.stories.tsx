import type { Meta, StoryObj } from '@storybook/react-vite';
import { fail, hold, theyEditFirst } from '../app/mocks/overrides';
import { SEED_EPOCH } from '../app/mocks/seed';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { draftStorage } from '../app/model/drafts';
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


// Edit: /records/:id/edit. The save is a versioned write (If-Match); theyEditFirst makes someone
// else save a change first, so the save meets a 409 with their version.
const edit = { recordId: 'r-1001' } as const;
export const EditRecord: Story = { args: edit };
export const EditSaved: Story = { args: { ...edit, initialDraft: { name: 'Hardware lease 2027' }, initialSubmitting: true } };
/** They changed the amount, you changed the name: no field collides, so your edit is re-based on their version and saved. */
export const EditMergedWithTheirs: Story = {
  args: { ...edit, initialDraft: { name: 'Hardware lease 2027' }, initialSubmitting: true },
  parameters: mswOverrides(theyEditFirst({ amountMinor: 9_900_000 })),
};
/** You both renamed it: yours and theirs side by side, Keep mine (overwrite) or Take theirs. */
export const EditConflict: Story = {
  args: { ...edit, initialDraft: { name: 'Hardware lease 2027' }, initialSubmitting: true },
  parameters: mswOverrides(theyEditFirst({ name: 'Hardware lease (renegotiated)' })),
};
/** You both changed the name and the amount: a choice per field, then Save these choices. */
export const EditConflictPerField: Story = {
  args: { ...edit, initialDraft: { name: 'Hardware lease 2027', amount: '15000.00' }, initialSubmitting: true },
  parameters: mswOverrides(theyEditFirst({ name: 'Hardware lease (renegotiated)', amountMinor: 9_900_000 })),
};

// Drafts: the form owns its draft, autosaved on this device (localStorage, per workspace, person
// and record). These stories put one there before the page opens.
const storedDraft = (entity: string, values: Record<string, unknown>) => () => {
  draftStorage.write(`acme:u-sam:${entity}`, { values: { name: '', owner: '', account: '', description: '', amount: '', renewal: '', remind: true, ...values }, base: undefined, savedAt: SEED_EPOCH - 5 * 60_000 });
};
/** The form opened with a draft kept from last time: restored, with Discard them. */
export const DraftRestored: Story = { beforeEach: storedDraft('record:new', { name: 'Hardware lease', owner: 'acme-p02', amount: '12500' }) };
/** Unsaved changes, and a link was followed: the guard holds the navigation and asks. */
export const UnsavedChangesGuard: Story = {
  tags: ['modal-open'],
  args: { initialLeave: '/records' },
  beforeEach: storedDraft('record:new', { name: 'Hardware lease', owner: 'acme-p02', amount: '12500' }),
};
/** Someone else saved the record while it was being edited: the typed changes stay, with a warning and Review changes. */
export const EditChangedWhileEditing: Story = {
  args: { ...edit, initialDraft: { name: 'Hardware lease 2027' } },
  parameters: mockApi({ anotherUser: [{ kind: 'edit', id: 'r-1001', changes: { amountMinor: 9_900_000 } }] }),
};
