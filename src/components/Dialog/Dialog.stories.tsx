import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { TextField } from '../TextField/TextField';
import { Dialog } from './Dialog';

const footer = (
  <>
    <Button variant="secondary">Cancel</Button>
    <Button>Create record</Button>
  </>
);

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  args: {
    title: 'New record',
    description: 'Records start as drafts until they are sent.',
    footer,
    children: <TextField label="Name" />,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { args: { trigger: <Button>Open dialog</Button> } };
export const Open: Story = { tags: ['modal-open'], args: { defaultOpen: true } };
export const Small: Story = {
  tags: ['modal-open'],
  args: {
    defaultOpen: true,
    size: 'sm',
    title: 'Delete record?',
    description: 'This cannot be undone.',
    children: undefined,
    footer: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </>
    ),
  },
};
export const Large: Story = { tags: ['modal-open'], args: { defaultOpen: true, size: 'lg' } };
export const WithoutDescription: Story = { tags: ['modal-open'], args: { defaultOpen: true, description: undefined } };
