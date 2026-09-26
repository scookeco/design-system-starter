/**
 * The app's shell composition, shared by every example page: one nav config, one account menu.
 * A product defines this once; each page passes only where it is (current, breadcrumbs) and its content.
 *
 * Inside the app layer (AppProviders), the brand is the active workspace and the account menu
 * switches workspace and signs out, both through the session, which keeps the cache boundaries
 * (src/app/session.tsx). Static example pages render outside it and get a fixed menu.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { AppShell, Avatar, Breadcrumbs, Button, Menu, Nav, type BreadcrumbLink, type MenuEntry, type NavSection } from '../index';
import { useOptionalAppSession, type AppSession } from '../app/session';
import { useNavigate } from '../app/url/useUrlState';
import { WORKSPACES } from '../app/workspaces';
import { CommandMenu } from './CommandMenu';

const NAV: readonly NavSection[] = [
  {
    items: [
      { label: 'Home', href: '/home', icon: 'home' },
      { label: 'Records', href: '/records', icon: 'file' },
      { label: 'Accounts', href: '/accounts', icon: 'building' },
      { label: 'People', href: '/people', icon: 'users' },
    ],
  },
  { label: 'Workspace', items: [{ label: 'Settings', href: '/settings', icon: 'settings' }] },
];

/**
 * An assistant beside whatever page renders inside: a page composed with an assistant (the record
 * copilot) wraps an existing page in this instead of editing it. Nothing provided, no panel.
 */
const AssistantSlot = createContext<ReactNode>(null);

export function WithAssistant({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  return <AssistantSlot value={panel}>{children}</AssistantSlot>;
}

export interface ExampleShellProps {
  /** href of the primary nav item this page belongs to. */
  current: string;
  /** Ancestors and current page title. Omit on top-level pages. */
  trail?: { items: readonly BreadcrumbLink[]; current: string };
  /** Sticky page action bar (long forms). */
  footer?: ReactNode;
  /** An AssistantPanel beside the page. Pages that wrap another page use WithAssistant instead. */
  assistant?: ReactNode;
  /** Open the command palette with this query (gallery and tests). */
  initialPaletteQuery?: string;
  children: ReactNode;
}

const HELP_ITEMS: readonly MenuEntry[] = [{ label: 'Help centre' }, { label: 'Contact support' }];
const HELP = <Menu align="end" trigger={<Button variant="ghost">Help</Button>} items={HELP_ITEMS} />;

export function ExampleShell({ current, trail, footer, assistant, initialPaletteQuery, children }: ExampleShellProps) {
  const app = useOptionalAppSession();
  const injected = useContext(AssistantSlot);
  const panel = assistant ?? injected;
  // Inside the app: the command palette (⌘K) and the shortcuts overlay (?), which the Help menu opens too.
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  return (
    <AppShell
      brand={app ? WORKSPACES[app.tenant].name : 'Acme'}
      nav={<Nav label="Main" sections={NAV} current={current} />}
      breadcrumbs={trail ? <Breadcrumbs items={trail.items} current={trail.current} /> : undefined}
      footer={footer}
      {...(panel ? { assistant: panel } : {})}
      actions={
        app ? (
          <CommandMenu
            helpOpen={shortcutsOpen}
            onHelpOpenChange={setShortcutsOpen}
            {...(initialPaletteQuery === undefined ? {} : { defaultOpen: true, initialQuery: initialPaletteQuery })}
          />
        ) : undefined
      }
      help={app ? <Menu align="end" trigger={<Button variant="ghost">Help</Button>} items={[...HELP_ITEMS, { label: 'Keyboard shortcuts', shortcut: '?', onSelect: () => setShortcutsOpen(true) }]} /> : HELP}
      userMenu={app ? <AccountMenu app={app} current={current} /> : <StaticAccountMenu />}
    >
      {children}
    </AppShell>
  );
}

/** Switch workspace (one item per other membership) and sign out. A switch lands on the same section's index. */
function AccountMenu({ app, current }: { app: AppSession; current: string }) {
  const navigate = useNavigate();
  const others = app.memberships.filter((m) => m.tenant !== app.tenant);
  const items: MenuEntry[] = [
    { label: 'Profile' },
    { label: 'Settings', icon: 'settings' },
    ...(others.length > 0 ? (['separator'] as const) : []),
    ...others.map((m) => ({
      label: `Switch to ${WORKSPACES[m.tenant].name}`,
      onSelect: () => {
        app.switchTenant(m.tenant);
        if (current) navigate(current);
      },
    })),
    'separator',
    { label: 'Sign out', onSelect: () => void app.signOut() },
  ];
  return (
    <Menu
      align="end"
      label={app.session.user.email}
      trigger={
        <Button variant="ghost">
          <Avatar name={app.session.user.name} size="sm" />
        </Button>
      }
      items={items}
    />
  );
}

function StaticAccountMenu() {
  return (
    <Menu
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
}
