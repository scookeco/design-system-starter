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
