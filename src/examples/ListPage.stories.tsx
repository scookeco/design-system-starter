import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListPage } from './ListPage';

const meta = {
  title: 'Examples/List page',
  component: ListPage,
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { initialLoadState: 'loading' } };
export const FirstUse: Story = { args: { records: [] } };
export const EmptyResults: Story = { args: { initialQuery: 'no such record' } };
export const LoadError: Story = { args: { initialLoadState: 'error' } };
export const CreateDialogOpen: Story = { tags: ['modal-open', '!autodocs'], args: { initialDialogOpen: true } };
