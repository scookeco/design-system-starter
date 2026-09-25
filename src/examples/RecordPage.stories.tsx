import type { Meta, StoryObj } from '@storybook/react-vite';
import { fail, hold } from '../app/mocks/overrides';
import { mockApiMeta, mswOverrides } from '../app/mocks/storybook';
import { RecordPage } from './RecordPage';

const meta = {
  title: 'Examples/Record page',
  component: RecordPage,
  ...mockApiMeta,
} satisfies Meta<typeof RecordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MoreActionsOpen: Story = { tags: ['modal-open'], args: { initialMenuOpen: true } };
export const Loading: Story = { tags: ['busy'], parameters: mswOverrides(hold('get', '/records/:id')) };
export const LoadError: Story = { parameters: mswOverrides(fail('get', '/records/:id')) };
export const ActivitySection: Story = { args: { initialSection: 'activity' } };
export const FilesSection: Story = { args: { initialSection: 'files' } };
