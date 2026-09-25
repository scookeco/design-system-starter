import { AppShell, AuthLayout, Button, Heading, Nav, Stack, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [AuthLayout],
  whenToUse: [
    'Every signed-out page: sign-in, sign-up, password reset, an emailed-link landing, a verification code step.',
    'An error page shown when the app itself may have failed to load, so the shell can’t be relied on.',
    'The card holds the page’s h1 first (a `Heading` at level 1), then one form; copy the Sign in example.',
  ],
  whenNotToUse: [
    { situation: 'A signed-in page, including a signed-in 404', instead: '`AppShell`, so navigation stays' },
    { situation: 'A multi-step setup after sign-in', instead: '`FocusedLayout`' },
  ],
  do: {
    caption: 'Brand above, one card with the h1 and the way in, legal links below.',
    render: () => (
      <AuthLayout brand="Acme" footer={<Text size="caption">Privacy · Terms</Text>}>
        <Stack gap="2xs">
          <Heading level={1} size={3}>
            Sign in to Acme
          </Heading>
          <Text tone="muted">Use your work account.</Text>
        </Stack>
        <Button>Continue with SSO</Button>
      </AuthLayout>
    ),
  },
  dont: {
    caption: 'Sign-in inside the app shell: navigation to pages the person can’t open yet, and a frame that implies they’re signed in.',
    render: () => (
      <AppShell
        brand="Acme"
        nav={<Nav label="Main (don’t example)" sections={[{ items: [{ label: 'Home', href: '/home', icon: 'home' }] }]} />}
        skipLinkLabel="Skip to content (don’t example)"
        sidebarStorageKey={null}
      >
        <Button>Continue with SSO</Button>
      </AppShell>
    ),
  },
  accessibility: [
    'Provides banner (brand), main (the card) and contentinfo (footer) landmarks; the page supplies the one h1 inside the card.',
    'The card never exceeds `size.content.xs` and reflows at 400% zoom; the page scrolls when the card is taller than the viewport.',
  ],
};
