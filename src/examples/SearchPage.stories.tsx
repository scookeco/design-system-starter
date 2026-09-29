import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../.storybook/DemoBox';
import { fail, hold } from '../app/mocks/overrides';
import { mockApi, mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { SearchPage } from './SearchPage';

const meta = {
  title: 'Examples/Search',
  component: SearchPage,
  tags: ['!autodocs', 'data'],
  ...mockApiMeta,
} satisfies Meta<typeof SearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing typed yet: what search covers, and / to start. */
export const Start: Story = { parameters: mockApi({ url: '/search' }) };
/** Every type, best match first; the matched text is bold, counts on each type tab and status. */
export const Results: Story = { parameters: mockApi({ url: '/search?q=lease' }) };
/** A person's name matches her own row and the second line of every record she owns. */
export const MatchesInDetail: Story = { parameters: mockApi({ url: '/search?q=priya' }) };
/** Records only, narrowed to two statuses: all in the URL, so the link reproduces it. */
export const Refined: Story = { parameters: mockApi({ url: '/search?q=lease&type=record&status=pending,overdue' }) };
export const NoResults: Story = { parameters: mockApi({ url: '/search?q=zeppelin' }) };
/** Matches exist, but not with these filters: Clear filters. */
export const NoResultsWithFilters: Story = { parameters: mockApi({ url: '/search?q=lease&type=person' }) };
/** A viewer's search finds no drafts: the server leaves them out, as it does in the list. */
export const AsViewer: Story = { parameters: mockApi({ url: '/search?q=lease', role: 'viewer' }) };
export const Loading: Story = { tags: ['busy'], parameters: { ...mockApi({ url: '/search?q=lease' }), ...mswOverrides(hold('get', '/search')) } };
export const LoadError: Story = { parameters: { ...mockApi({ url: '/search?q=lease' }), ...mswOverrides(fail('get', '/search')) } };
/** A narrow screen: the status filter stacks under the results. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
  parameters: mockApi({ url: '/search?q=lease' }),
};
