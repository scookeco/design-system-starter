import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { Avatar } from '../../components/Avatar/Avatar';
import { Breadcrumbs } from '../../components/Breadcrumbs/Breadcrumbs';
import { Button } from '../../components/Button/Button';
import { Heading } from '../../components/Heading/Heading';
import { Menu } from '../../components/Menu/Menu';
import { Nav } from '../../components/Nav/Nav';
import { Text } from '../../components/Text/Text';
import { Center } from '../../primitives/Center/Center';
import { Stack } from '../../primitives/Stack/Stack';
import { AppShell } from './AppShell';

const nav = (
  <Nav
    label="Main"
    current="/records"
    sections={[
      {
        items: [
          { label: 'Home', href: '/home', icon: 'home' },
          { label: 'Records', href: '/records', icon: 'file' },
          { label: 'People', href: '/people', icon: 'users' },
        ],
      },
      { label: 'Workspace', items: [{ label: 'Settings', href: '/settings', icon: 'settings' }] },
    ]}
  />
);

const userMenu = (open = false) => (
  <Menu
    defaultOpen={open}
    align="end"
    label="sam.rivera@example.com"
    trigger={
      <Button variant="ghost">
        <Avatar name="Sam Rivera" size="sm" />
      </Button>
    }
    items={[{ label: 'Profile' }, { label: 'Settings', icon: 'settings' }, 'separator', { label: 'Sign out' }]}
  />
);

const page = (
  <Center max="lg" gutters="lg">
    <Stack gap="sm">
      <Heading level={1}>Records</Heading>
      <Text tone="muted">Pages fill the shell’s main region. Only this region scrolls.</Text>
    </Stack>
  </Center>
);

const meta = {
  title: 'Layouts/AppShell',
  component: AppShell,
  args: {
    brand: 'Acme',
    nav,
    breadcrumbs: <Breadcrumbs items={[{ label: 'Home', href: '/home' }]} current="Records" />,
    userMenu: userMenu(),
    children: page,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutBreadcrumbs: Story = { args: { breadcrumbs: undefined } };
export const WithGlobalAction: Story = { args: { actions: <Button icon="plus">New record</Button> } };
export const WithActionBar: Story = {
  args: {
    footer: (
      <Center max="lg" gutters="lg">
        <Stack gap="sm" align="end">
          <Button>Save changes</Button>
        </Stack>
      </Center>
    ),
  },
};
export const UserMenuOpen: Story = { tags: ['modal-open'], args: { userMenu: userMenu(true) } };
export const NarrowCollapsed: Story = {
  decorators: [
    (Story) => (
      <DemoNarrow>
        <Story />
      </DemoNarrow>
    ),
  ],
};
export const NarrowNavOpen: Story = { ...NarrowCollapsed, args: { defaultNavOpen: true } };
