import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge/Badge';
import { Disclosure } from './Disclosure';

const meta = {
  title: 'Components/Disclosure',
  component: Disclosure,
  args: {
    summary: 'Searched records matching “overdue”',
    children: 'Found 12 records in Acme. 2 are archived and were left out.',
  },
} satisfies Meta<typeof Disclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { defaultOpen: true } };
export const WithMeta: Story = { args: { defaultOpen: true, meta: <Badge tone="success">Done</Badge> } };
