import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListPage } from './ListPage';

const meta = {
  title: 'Examples/List page',
  component: ListPage,
} satisfies Meta<typeof ListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const EmptyResults: Story = { args: { initialQuery: 'no such record' } };
export const CreateDialogOpen: Story = { tags: ['modal-open'], args: { initialDialogOpen: true } };
