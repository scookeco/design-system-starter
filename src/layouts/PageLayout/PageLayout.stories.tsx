import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoBox, DemoNarrow } from '../../../.storybook/DemoBox';
import { Nav } from '../../components/Nav/Nav';
import { PageLayout } from './PageLayout';

const nav = (
  <Nav
    label="Settings"
    current="/settings/notifications"
    sections={[
      {
        label: 'Personal',
        items: [
          { label: 'Profile', href: '/settings/profile' },
          { label: 'Notifications', href: '/settings/notifications' },
        ],
      },
      { label: 'Workspace', items: [{ label: 'General', href: '/settings/general' }] },
    ]}
  />
);

const main = <DemoBox>Main column: the page’s content, in cards.</DemoBox>;
const aside = <DemoBox>Aside: properties of the record.</DemoBox>;

const meta = {
  title: 'Layouts/PageLayout',
  component: PageLayout,
  args: { children: main },
} satisfies Meta<typeof PageLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MainOnly: Story = {};
export const WithAside: Story = { args: { aside, asideLabel: 'Properties' } };
export const WithNav: Story = { args: { nav } };
export const NavAndAside: Story = { args: { nav, aside, asideLabel: 'Properties' } };
export const NarrowStacked: Story = {
  args: { nav, aside, asideLabel: 'Properties' },
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
