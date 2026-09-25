import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell, Avatar, Button, Heading, Menu, Nav } from '../../../src/index';

/**
 * Check fixture for SC 3.2.6 (tests/visual/wcag22.spec.ts): an app page whose shell has an account
 * menu but no help slot, so the consistent-help check must fail it.
 * Hidden from the gallery and from the screenshot and axe suite.
 */
const meta = {
  title: 'Check fixtures/Consistent help',
  tags: ['check-fixture', 'expect:consistent-help', '!dev', '!autodocs', 'no-visual'],
  parameters: { layout: 'fullscreen' },
  render: () => (
    <AppShell
      brand="Acme"
      sidebarStorageKey={null}
      nav={<Nav label="Main" current="/home" sections={[{ items: [{ label: 'Home', href: '/home', icon: 'home' }] }]} />}
      userMenu={
        <Menu
          align="end"
          trigger={
            <Button variant="ghost">
              <Avatar name="Sam Rivera" size="sm" />
            </Button>
          }
          items={[{ label: 'Sign out' }]}
        />
      }
    >
      <Heading level={1}>A page with no help</Heading>
    </AppShell>
  ),
} satisfies Meta;

export default meta;
export const ShellWithoutHelp: StoryObj<typeof meta> = {};
