import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { Popover } from './Popover';

const meta = {
  title: 'Components/Popover',
  component: Popover,
  args: {
    label: 'Filter by status',
    trigger: (
      <Button variant="secondary" icon="settings">
        Filters
      </Button>
    ),
    children: (
      <>
        <Checkbox label="Active" defaultChecked />
        <Checkbox label="Pending" />
        <Checkbox label="Overdue" defaultChecked />
        <Checkbox label="Draft" />
      </>
    ),
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { tags: ['!autodocs'], args: { defaultOpen: true } };
export const OpenAlignedEnd: Story = { tags: ['!autodocs'], args: { defaultOpen: true, align: 'end' } };
