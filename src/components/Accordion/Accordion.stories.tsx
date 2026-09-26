import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge/Badge';
import { Accordion, type AccordionItem } from './Accordion';


const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  args: { items: steps() },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = { args: { defaultValue: 'check' } };
export const Multiple: Story = { args: { type: 'multiple', defaultValue: ['search', 'propose'] } };
export const AllClosed: Story = {};
export const WithDisabledItem: Story = { args: { items: [...steps().slice(0, 2), { value: 'apply', title: 'Apply changes', content: 'Not started.', disabled: true }] } };

/** The steps an agent took (after the meta: the docs test reads the first title in the file). */
function steps(): AccordionItem[] {
  return [
  { value: 'search', title: 'Search records', meta: <Badge tone="success">Done</Badge>, content: 'Filter: status is Overdue. 12 records matched.' },
  { value: 'check', title: 'Check permissions', meta: <Badge tone="success">Done</Badge>, content: 'You can move 10 of them. 2 are archived.' },
  { value: 'propose', title: 'Propose changes', meta: <Badge tone="info">Waiting for you</Badge>, content: '10 status changes, waiting for your review.' },
  ];
}
