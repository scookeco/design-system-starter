import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    reason: 'first-use',
    title: 'Create your first record',
    description: 'Records keep each agreement, its owner and its amount in one place.',
    action: <Button icon="plus">New record</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstUse: Story = {};
export const NoResults: Story = {
  args: {
    reason: 'no-results',
    title: 'No records match',
    description: 'Try a different search term or status.',
    action: <Button variant="secondary">Clear filters</Button>,
  },
};
export const LoadError: Story = {
  args: {
    reason: 'error',
    title: 'Couldn’t load records',
    description: 'The server didn’t answer in time. Nothing was lost.',
    action: <Button variant="secondary">Retry</Button>,
  },
};
export const WithoutAction: Story = { args: { reason: 'no-results', title: 'No activity yet', description: undefined, action: undefined } };
