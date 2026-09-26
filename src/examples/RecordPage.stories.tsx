import type { Meta, StoryObj } from '@storybook/react-vite';
import { fail, hold, theyEditFirst } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { seedRecords } from '../app/mocks/seed';
import { isSystemTag } from '../app/model/predicates';
import { RecordPage } from './RecordPage';

const meta = {
  title: 'Examples/Record page',
  component: RecordPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof RecordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first seeded record with a tag a person can remove (legal hold isn't one). */
const TAGGED = (() => {
  const record = seedRecords('acme').find((r) => r.tags.some((t) => !isSystemTag(t)));
  return { id: record?.id ?? 'r-1001', tag: record?.tags.find((t) => !isSystemTag(t)) ?? '' };
})();

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
/**
 * Two renames in quick succession, the first held on the wire: the write queue sends one at a time,
 * the title shows the latest, and the header says how many changes are pending.
 */
export const RenamesQueued: Story = {
  tags: ['busy'],
  args: { initialAction: { kind: 'rename', name: ['Master cleaning agreement 2027', 'Master cleaning agreement 2028'] } },
  parameters: mswOverrides(hold('patch', '/records/:id')),
};
/** The server refused: the old name is back, and a toast that stays says so. */
export const RenameFailedRolledBack: Story = { args: rename, parameters: mswOverrides(fail('patch', '/records/:id')) };
/** Someone else changed the record first: a 409, shown as a Banner with Reload. */
export const RenameConflict: Story = {
  args: rename,
  parameters: mswOverrides(fail('patch', '/records/:id', 409, 'conflict', 'Someone else changed this record.')),
};
/** A 409 that carries their version: the conflict panel compares the names, with Keep mine and Take theirs. */
export const RenameConflictWithTheirs: Story = { args: rename, parameters: mswOverrides(theyEditFirst({ name: 'Master cleaning agreement (renewed)' })) };
/** Archive, once its undo window has closed and the request is in flight: "Archiving…" on More, the other actions disabled. */
export const ArchivePending: Story = {
  tags: ['busy'],
  args: { initialAction: { kind: 'archive' } },
  parameters: { ...mswOverrides(hold('post', '/records/:id/archive')), ...mockApi({ undoWindow: 0 }) },
};
/** Archive without an "Are you sure?": archived at once, held in the undo window, with Undo in the toast. */
export const ArchiveUndoOffered: Story = { args: { initialAction: { kind: 'archive' } }, parameters: mockApi({ undoWindow: 'hold' }) };
/** A tag removed from Properties: gone at once, with Undo; Add tag puts one back. */
export const TagRemovedUndoOffered: Story = {
  args: { recordId: TAGGED.id, initialAction: { kind: 'untag', tag: TAGGED.tag } },
  parameters: mockApi({ undoWindow: 'hold' }),
};

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


/** Another person renamed this record while it was open: the page shows their version in place. */
export const EditedElsewhere: Story = { parameters: mockApi({ anotherUser: [{ kind: 'edit', id: 'r-1001', changes: { name: 'Annual hosting agreement (renegotiated)' } }] }) };
/** Another person deleted this record while it was open: the page says so instead of offering actions on it. */
export const DeletedElsewhere: Story = { parameters: mockApi({ anotherUser: [{ kind: 'delete', id: 'r-1001' }] }) };

/** A job started on the list keeps going on every page: the shell's Jobs popover follows it. */
export const JobsFollowYou: Story = {
  args: { initialJobsOpen: true },
  parameters: mockApi({ jobs: [{ state: 'running' }, { state: 'succeeded', total: 12, failures: 2, label: 'Delete 12 records matching “lease”' }] }),
};
