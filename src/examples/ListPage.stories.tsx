import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { emptyWorkspace, fail, hold, malformed } from '../app/mocks/overrides';
import { ListPage } from './ListPage';

const meta = {
  title: 'Examples/List page',
  component: ListPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof ListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { tags: ['busy'], parameters: mswOverrides(hold('get', '/records'), hold('get', '/records/counts')) };
export const FirstUse: Story = { parameters: mswOverrides(...emptyWorkspace) };
export const EmptyResults: Story = { parameters: mockApi({ url: '/records?q=no+such+record' }) };
export const LoadError: Story = { parameters: mswOverrides(fail('get', '/records')) };
/** A 200 whose body breaks the contract lands in the error state, never in the cache. */
export const InvalidPayload: Story = { parameters: mswOverrides(malformed('/records')) };
export const CreateDialogOpen: Story = { tags: ['modal-open'], args: { initialDialogOpen: true } };
export const FiltersOpen: Story = { args: { initialFiltersOpen: true }, parameters: mockApi({ url: '/records?status=pending,active' }) };
export const FilteredWithChips: Story = { parameters: mockApi({ url: '/records?status=pending,active' }) };
export const SecondPage: Story = { parameters: mockApi({ url: '/records?page=2' }) };
/** A shared link reproduces the view: tab, search, sort and page all come from the URL. */
export const OpenedFromLink: Story = { parameters: mockApi({ url: '/records?view=open&q=lease&sort=-amount' }) };
/** Another tenant: its own records, currency and counts, under its own cache keys. */
export const OtherTenant: Story = { parameters: mockApi({ tenant: 'globex' }) };
/** The same query as a board: one column per status the view lets through, totals from the server's counts. */
export const Board: Story = { parameters: mockApi({ url: '/records?display=board' }) };
/** A filter narrows the board to its columns, as it narrows the table to its rows. */
export const BoardFiltered: Story = { parameters: mockApi({ url: '/records?display=board&view=open&q=lease' }) };
export const RowsSelected: Story = { args: { initialSelection: 'page' } };
/** "Select all N matching": the selection is the filter, not the ids on this page. */
export const AllMatchingSelected: Story = { args: { initialSelection: 'matching' } };
export const BulkDeleteConfirm: Story = { tags: ['modal-open'], args: { initialSelection: 'page', initialBulkDelete: 'confirm' } };
/** Pessimistic: the dialog stays, Delete shows its pending state, Cancel is disabled. */
export const BulkDeletePending: Story = {
  tags: ['modal-open', 'busy'],
  args: { initialSelection: 'page', initialBulkDelete: 'submit' },
  parameters: mswOverrides(hold('post', '/records/bulk-delete')),
};
/** Every draft, deleted by filter; the ones on legal hold fail and stay listed, with Retry. */
export const BulkDeletePartialFailure: Story = {
  args: { initialSelection: 'matching', initialBulkDelete: 'submit' },
  parameters: mockApi({ url: '/records?view=drafts' }),
};

/** Viewer: no Drafts tab (the server hides drafts from this role), and New record disabled with the reason beside it. */
export const AsViewer: Story = { parameters: mockApi({ role: 'viewer' }) };
/** Viewer on the board: the same columns, minus drafts, and no Move to… on any card. */
export const AsViewerBoard: Story = { parameters: mockApi({ role: 'viewer', url: '/records?display=board' }) };
/** Editor: can create and move, but only admins delete. The bulk bar's Delete says so. */
export const AsEditorWithSelection: Story = { args: { initialSelection: 'page' }, parameters: mockApi({ role: 'editor' }) };

/** A saved view, chosen: its config is in the URL (saved=acme-v1), and the Select names it. */
export const SavedViewChosen: Story = { parameters: mockApi({ url: '/records?view=open&q=lease&sort=-amount&saved=acme-v1' }) };
/** The URL has moved on from the saved view (a column hidden): "Modified", with Save changes in View options. */
export const SavedViewModified: Story = { parameters: mockApi({ url: '/records?view=open&q=lease&sort=-amount&columns=owner,status,updated,amount&saved=acme-v1' }) };
export const SaveViewDialog: Story = { tags: ['modal-open'], args: { initialViewDialog: 'save' }, parameters: mockApi({ url: '/records?view=open&status=overdue' }) };
/** Fewer columns, from the Columns popover: part of the URL, so part of a saved view. */
export const ColumnsChosen: Story = { parameters: mockApi({ url: '/records?columns=owner,status,amount' }) };


// Keeping the list fresh: another person's changes arrive through the live channel once the page
// has loaded (mockApi({ anotherUser })). The gallery's "Another user…" toolbar pushes one on demand.
/** Three records added elsewhere: counted, not inserted, so the rows stay put until "Show 3 new". */
export const LiveNewRecords: Story = { parameters: mockApi({ anotherUser: [{ kind: 'add' }, { kind: 'add' }, { kind: 'add' }] }) };
/** The first row, edited elsewhere: patched in place (no reorder), with "Updated just now by …". */
export const LiveRowUpdated: Story = { parameters: mockApi({ anotherUser: [{ kind: 'edit' }] }) };
/** The first row, deleted elsewhere: it leaves every cached page, and the total drops. */
export const LiveRowDeleted: Story = { parameters: mockApi({ anotherUser: [{ kind: 'delete' }] }) };
