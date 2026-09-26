import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from '../Link/Link';
import { Timeline, type TimelineEvent } from './Timeline';

const events: TimelineEvent[] = [
  { id: '4', actor: 'Priya Shah', verb: 'marked the invoice as', target: 'Paid', time: '12 Mar 2026, 14:05', dateTime: '2026-03-12T14:05:00Z' },
  {
    id: '3',
    actor: 'Tom Okafor',
    verb: 'commented',
    detail: 'Payment confirmed by the bank this morning.',
    time: '12 Mar 2026, 09:41',
    dateTime: '2026-03-12T09:41:00Z',
  },
  { id: '2', actor: 'System', verb: 'sent a reminder to', target: 'accounts@northwind.example', time: '5 Mar 2026, 08:00', dateTime: '2026-03-05T08:00:00Z' },
  { id: '1', actor: 'Priya Shah', verb: 'created the invoice', time: '1 Mar 2026, 16:22', dateTime: '2026-03-01T16:22:00Z' },
];

const meta = {
  title: 'Components/Timeline',
  component: Timeline,
  args: { label: 'Activity on INV-2041', events },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLinkedTargets: Story = {
  args: {
    events: [
      { id: '2', actor: 'Tom Okafor', verb: 'attached', target: <Link href="#files">Site survey.pdf</Link>, time: '2 hours ago', dateTime: '2026-03-12T12:00:00Z' },
      { id: '1', actor: 'Priya Shah', verb: 'moved the request to', target: <Link href="#board">Facilities</Link>, time: 'Yesterday', dateTime: '2026-03-11T10:00:00Z' },
    ],
  },
};
export const SingleEvent: Story = { args: { events: events.slice(-1) } };
export const Empty: Story = { args: { events: [] } };
