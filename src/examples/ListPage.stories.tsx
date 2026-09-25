import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockApiMeta, mswOverrides, withMockApi } from '../app/mocks/storybook';
import { emptyWorkspace, fail, hold, malformed } from '../app/mocks/overrides';
import { ListPage } from './ListPage';

const meta = {
  title: 'Examples/List page',
  component: ListPage,
  ...mockApiMeta,
  decorators: [withMockApi()],
} satisfies Meta<typeof ListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { tags: ['busy'], parameters: mswOverrides(hold('get', '/records'), hold('get', '/records/counts')) };
export const FirstUse: Story = { parameters: mswOverrides(...emptyWorkspace) };
export const EmptyResults: Story = { args: { initialQuery: 'no such record' } };
export const LoadError: Story = { parameters: mswOverrides(fail('get', '/records')) };
/** A 200 whose body breaks the contract lands in the error state, never in the cache. */
export const InvalidPayload: Story = { parameters: mswOverrides(malformed('/records')) };
export const CreateDialogOpen: Story = { tags: ['modal-open'], args: { initialDialogOpen: true } };
export const FiltersOpen: Story = { args: { initialFiltersOpen: true, initialStatuses: ['active', 'pending'] } };
export const FilteredWithChips: Story = { args: { initialStatuses: ['active', 'pending'] } };
export const SecondPage: Story = { args: { initialPage: 2 } };
/** Another tenant: its own records, currency and counts, under its own cache keys. */
export const OtherTenant: Story = { decorators: [withMockApi('globex')] };
