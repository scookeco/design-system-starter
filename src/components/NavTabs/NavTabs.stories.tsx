import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { NavTabs } from './NavTabs';

const items = [
  { label: 'Overview', href: '/records/r-1001' },
  { label: 'Activity', href: '/records/r-1001/activity' },
  { label: 'Files', href: '/records/r-1001/files' },
];

const meta = {
  title: 'Components/NavTabs',
  component: NavTabs,
  args: { label: 'Record sections', items, current: '/records/r-1001' },
} satisfies Meta<typeof NavTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstCurrent: Story = {};
export const LaterCurrent: Story = { args: { current: '/records/r-1001/files' } };
export const ManySectionsNarrow: Story = {
  args: {
    items: [
      ...items,
      { label: 'Approvals', href: '/records/r-1001/approvals' },
      { label: 'Related records', href: '/records/r-1001/related' },
      { label: 'Audit log', href: '/records/r-1001/audit' },
      { label: 'Contacts', href: '/records/r-1001/contacts' },
      { label: 'Invoices', href: '/records/r-1001/invoices' },
    ],
  },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
