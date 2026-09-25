import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecordPage } from './RecordPage';

const meta = {
  title: 'Examples/Record page',
  component: RecordPage,
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RecordPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MoreActionsOpen: Story = { tags: ['modal-open', '!autodocs'], args: { initialMenuOpen: true } };
export const Loading: Story = { args: { initialLoadState: 'loading' } };
export const LoadError: Story = { args: { initialLoadState: 'error' } };
