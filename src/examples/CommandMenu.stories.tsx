import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageHeader } from '../index';
import { mockApi, mockApiMeta } from '../app/mocks/storybook';
import { ExampleShell } from './ExampleShell';

function PaletteDemo({ query }: { query: string }) {
  return (
    <ExampleShell current="/home" initialPaletteQuery={query}>
      <PageHeader title="Home" />
    </ExampleShell>
  );
}

// The app's palette over a signed-in page: pages from the route table, records from the server's
// search, accounts and people from their directories, actions; all filtered with `can`.
const meta = {
  title: 'Examples/Command palette',
  component: PaletteDemo,
  tags: ['!autodocs', 'data', 'modal-open'],
  args: { query: '' },
  ...mockApiMeta,
} satisfies Meta<typeof PaletteDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing typed: Jump to (every page this role may open, with its "g then …" keys) and Actions. */
export const Open: Story = {};
/** Records from the server's search (the list's own query), then accounts and people that match. */
export const SearchingRecords: Story = { args: { query: 'lease' } };
export const FindsAnAccount: Story = { args: { query: 'north' } };
/** An admin typing "new": New record, New account and their pages. */
export const CreateActions: Story = { args: { query: 'new' } };
/** A viewer typing "new": no create pages, no create actions. The palette asks `can`, like the buttons and the routes. */
export const CreateActionsAsViewer: Story = { args: { query: 'new' }, parameters: mockApi({ role: 'viewer' }) };
export const NoResults: Story = { args: { query: 'qqq' } };
