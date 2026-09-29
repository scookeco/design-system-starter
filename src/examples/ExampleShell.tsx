/**
 * The app's shell composition, shared by every example page: one nav config, one account menu.
 * A product defines this once; each page passes only where it is (current, breadcrumbs) and its content.
 *
 * Inside the app layer (AppProviders), the brand is the active workspace and the account menu
 * switches workspace and signs out, both through the session, which keeps the cache boundaries
 * (src/app/session.tsx). Static example pages render outside it and get a fixed menu.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { AppShell, Avatar, Breadcrumbs, BuildingIcon, Button, FileIcon, HomeIcon, InboxIcon, Menu, Nav, SettingsIcon, ShieldIcon, TrendUpIcon, UsersIcon, type BreadcrumbLink, type MenuEntry, type NavSection } from '../index';
import { useOptionalAppSession, type AppSession } from '../app/session';
import { useNavigate } from '../app/url/useUrlState';
import { WORKSPACES } from '../app/workspaces';
import { CommandMenu } from './CommandMenu';
import { JobsIndicator } from './Jobs';
import { NotificationsIndicator } from './Notifications';

const NAV: readonly NavSection[] = [
  {
    items: [
      { label: 'Home', href: '/home', icon: HomeIcon },
      { label: 'Inbox', href: '/inbox', icon: InboxIcon },
      { label: 'Records', href: '/records', icon: FileIcon },
      { label: 'Accounts', href: '/accounts', icon: BuildingIcon },
      { label: 'People', href: '/people', icon: UsersIcon },
      // Demo examples: reports (charts from the chart tokens).
      { label: 'Reports', href: '/reports', icon: TrendUpIcon },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Settings', href: '/settings', icon: SettingsIcon },
      { label: 'Admin', href: '/admin/members', icon: ShieldIcon },
    ],
  },
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
  /** Open the shortcuts overlay (gallery and tests). */
  initialShortcutsOpen?: boolean;
  /** Open the jobs popover on first render (gallery and tests). */
  jobsOpen?: boolean;
  /** Open the notifications popover on first render (gallery and tests). */
  notificationsOpen?: boolean;
  children: ReactNode;
}

const HELP_ITEMS: readonly MenuEntry[] = [{ label: 'Help centre' }, { label: 'Contact support' }];
const HELP = <Menu align="end" trigger={<Button variant="ghost">Help</Button>} items={HELP_ITEMS} />;

export function ExampleShell({ current, trail, footer, assistant, initialPaletteQuery, initialShortcutsOpen = false, jobsOpen = false, notificationsOpen = false, children }: ExampleShellProps) {
  const app = useOptionalAppSession();
  const injected = useContext(AssistantSlot);
  const panel = assistant ?? injected;
  // Inside the app: the command palette (⌘K) and the shortcuts overlay (?), which the Help menu opens too.
  const [shortcutsOpen, setShortcutsOpen] = useState(initialShortcutsOpen);
  return (
    <AppShell
      brand={app ? WORKSPACES[app.tenant].name : 'Acme'}
      nav={<Nav label="Main" sections={NAV} current={current} />}
      breadcrumbs={trail ? <Breadcrumbs items={trail.items} current={trail.current} /> : undefined}
      footer={footer}
      {...(panel ? { assistant: panel } : {})}
      actions={
        app ? (
          <>
            <CommandMenu
              helpOpen={shortcutsOpen}
              onHelpOpenChange={setShortcutsOpen}
              {...(initialPaletteQuery === undefined ? {} : { defaultOpen: true, initialQuery: initialPaletteQuery })}
            />
            {/* Freshness and concurrency: the person's long-running jobs, on every page (nothing when there are none). */}
            <JobsIndicator defaultOpen={jobsOpen} />
            {/* Demo examples: the bell, with the unread count, on every page. */}
            <NotificationsIndicator defaultOpen={notificationsOpen} />
          </>
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
    { label: 'Settings', icon: SettingsIcon },
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
      items={[{ label: 'Profile' }, { label: 'Settings', icon: SettingsIcon }, 'separator', { label: 'Sign out' }]}
    />
  );
}
