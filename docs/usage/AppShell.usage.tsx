import { AppShell, Breadcrumbs, Button, Center, Heading, Nav, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

const nav = (label: string) => (
  <Nav
    label={label}
    current="/records"
    sections={[{ items: [{ label: 'Home', href: '/home', icon: 'home' }, { label: 'Records', href: '/records', icon: 'file' }] }]}
  />
);

export const usage: UsageDoc = {
  covers: [AppShell],
  whenToUse: [
    'Every signed-in page. Define the composition once for the app (brand, nav, account menu); pages pass where they are and their content.',
    'Fill the slots: `breadcrumbs`, `actions` (global only), `userMenu`, `children` (the page), `footer` (a long form’s action bar).',
    'People can collapse the wide sidebar to an icon rail; the shell remembers it in localStorage under `sidebarStorageKey`. Give every primary nav item an `icon` so the rail reads well.',
  ],
  whenNotToUse: [
    { situation: 'Sign-in, sign-up and other signed-out pages', instead: 'a centred card without the shell' },
    { situation: 'A page needs different chrome', instead: 'a proposal to extend AppShell; never a second frame' },
  ],
  do: {
    caption: 'The page fills main and uses the slots; the frame is untouched.',
    render: () => (
      <AppShell brand="Acme" nav={nav('Main (do example)')} breadcrumbs={<Breadcrumbs label="Breadcrumb (do example)" items={[{ label: 'Home', href: '/home' }]} current="Records" />} skipLinkLabel="Skip to content (do example)">
        <Center max="lg" gutters="md">
          <Stack gap="sm">
            <Heading level={3}>Records</Heading>
            <Text tone="muted">Only this region scrolls.</Text>
          </Stack>
        </Center>
      </AppShell>
    ),
  },
  dont: {
    caption: 'A page that rebuilds its own header and actions inside main: two headers, and page actions where global ones belong.',
    render: () => (
      <AppShell brand="Acme" nav={nav('Main (don’t example)')} actions={<Button>Save record</Button>} skipLinkLabel="Skip to content (don’t example)">
        <Center max="lg" gutters="md">
          <Stack gap="sm">
            <Heading level={3}>Acme · Records</Heading>
            <Text tone="muted">A second title bar, typed again on every page.</Text>
          </Stack>
        </Center>
      </AppShell>
    ),
  },
  accessibility: [
    'Provides the skip link, banner, navigation and main landmarks; `main` is the only scrolling region.',
    'The collapsed sidebar opens as a drawer that traps focus and returns it to the Menu button.',
    'The rail toggle has an accessible name that says what it will do, `aria-expanded` and a matching tooltip. In the rail, labels move into tooltips but stay each link’s accessible name.',
    'Product code owns the page’s h1 and moving focus to it after client-side navigation.',
  ],
};
