import type { Meta, StoryObj } from '@storybook/react-vite';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { RecordPage } from './RecordPage';

const meta = {
  title: 'Examples/Record page',
  component: RecordPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof RecordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const rename = { initialAction: { kind: 'rename', name: 'Master cleaning agreement 2027' } } as const;

export const Default: Story = {};
export const MoreActionsOpen: Story = { tags: ['modal-open'], args: { initialMenuOpen: true } };
export const Loading: Story = { tags: ['busy'], parameters: mswOverrides(hold('get', '/records/:id')) };
export const LoadError: Story = { parameters: mswOverrides(fail('get', '/records/:id')) };
export const ActivitySection: Story = { args: { initialSection: 'activity' } };
export const FilesSection: Story = { args: { initialSection: 'files' } };
/** Optimistic rename, in flight: the new name shows at once, with "Saving the new name…". */
export const RenamePending: Story = { tags: ['busy'], args: rename, parameters: mswOverrides(hold('patch', '/records/:id')) };
export const RenameSucceeded: Story = { args: rename };
/** The server refused: the old name is back, and a toast that stays says so. */
export const RenameFailedRolledBack: Story = { args: rename, parameters: mswOverrides(fail('patch', '/records/:id')) };
/** Someone else changed the record first: a 409, shown as a Banner with Reload. */
export const RenameConflict: Story = {
  args: rename,
  parameters: mswOverrides(fail('patch', '/records/:id', 409, 'conflict', 'Someone else changed this record.')),
};
/** Pessimistic archive, in flight: "Archiving…" on More, the other actions disabled. */
export const ArchivePending: Story = { tags: ['busy'], args: { initialAction: { kind: 'archive' } }, parameters: mswOverrides(hold('post', '/records/:id/archive')) };

/** Viewer: the More menu holds only what a viewer can do. Items they lack the capability for are hidden. */
export const AsViewerMoreActions: Story = { tags: ['modal-open'], args: { initialMenuOpen: true }, parameters: mockApi({ role: 'viewer' }) };
/** Editor: rename, duplicate and archive, but no Delete (admins only). */
export const AsEditorMoreActions: Story = { tags: ['modal-open'], args: { initialMenuOpen: true }, parameters: mockApi({ role: 'editor' }) };
/**
 * A forced 403: the UI allowed the rename, the server refused it (a role changed mid-session). The
 * optimistic name rolls back and a toast that stays says why.
 */
export const RenameForbidden: Story = {
  args: rename,
  parameters: mswOverrides(fail('patch', '/records/:id', 403, 'forbidden', 'Your role in this workspace changed: you can no longer rename records.')),
};

