/**
 * The app's command palette and global shortcuts: the shell composition mounts this once (in
 * AppShell's actions slot), so every signed-in page gets ⌘K / Ctrl+K, the "g then …" jumps and
 * the ? overlay.
 *
 * Nothing here is a list someone has to keep up to date by hand:
 *   Jump to   the route table (src/examples/routes.tsx): every page without params, named by its
 *             title, shown only if `can` allows its guard, the same check as the route itself
 *   Records   the server's search (the list's own query, five at a time; the server's projection
 *             per role, so a viewer finds no drafts); accounts and people from their directories
 *   Actions   PALETTE_ACTIONS below, each with the capability its button asks for
 *   Recent    what was opened from here, kept in the cache partition (src/app/model/recent.ts)
 * A command does what its button does: it navigates to the same route or calls the same session
 * function, so a palette command can't bypass a guard or a mutation's own check.
 */
import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, CommandPalette, Kbd, ShortcutHelp, Tooltip, useShortcut, type CommandGroup, type CommandItem, type IconName } from '../index';
import { getRecord } from '../app/api/records';
import type { Capability } from '../app/api/schemas';
import { recordKeys } from '../app/model/keys';
import { useAccounts, usePeople } from '../app/model/queries';
import { useRecentItems, type RecentItem } from '../app/model/recent';
import { MIN_SEARCH_LENGTH, useRecordSearch } from '../app/model/search';
import { STATUS } from '../app/model/status';
import { routeTitle, type Route } from '../app/routing/routes';
import { useAppSession, useCan, usePartition, type AppSession } from '../app/session';
import { useTenant } from '../app/tenant';
import { useNavigate } from '../app/url/useUrlState';
import { WORKSPACES } from '../app/workspaces';
import { ROUTES } from './routes';

/** "g then …" jumps. A page's keys show on its palette row and in the ? overlay. */
export const GO_KEYS: Readonly<Record<string, string>> = {
  '/home': 'g h',
  '/records': 'g r',
  '/accounts': 'g a',
  '/people': 'g p',
  '/settings': 'g s',
  '/inbox': 'g i',
  '/admin/members': 'g m',
};

/** An icon per top-level section, for Jump to rows. */
const SECTION_ICONS: Readonly<Record<string, IconName>> = {
  '/home': 'home',
  '/records': 'file',
  '/accounts': 'building',
  '/people': 'users',
  '/settings': 'settings',
  '/inbox': 'inbox',
  '/admin': 'shield',
};

interface PaletteAction {
  id: string;
  label: string;
  keywords?: readonly string[];
  icon?: IconName;
  /** Asked with `can`, like the button this mirrors. */
  capability: Capability;
  href: string;
}

/** Actions that mirror a button elsewhere in the app. Each needs what its button needs. */
export const PALETTE_ACTIONS: readonly PaletteAction[] = [
  { id: 'action:new-record', label: 'New record', keywords: ['create', 'add'], icon: 'plus', capability: 'record:create', href: '/records/new' },
  { id: 'action:new-account', label: 'New account', keywords: ['create', 'add', 'customer'], icon: 'plus', capability: 'account:create', href: '/accounts/new' },
  { id: 'action:invite', label: 'Invite member', keywords: ['add', 'user', 'team'], icon: 'users', capability: 'members:manage', href: '/admin/members?invite=1' },
];

/** Pages the palette can jump to: routes without params, in the shell, deduplicated by title. */
const jumpRoutes = (routes: readonly Route[]) => {
  const seen = new Set<string>();
  return routes.filter((route) => {
    const title = routeTitle(route);
    if (route.layout !== 'shell' || route.path.includes(':') || title === '' || seen.has(title)) return false;
    seen.add(title);
    return true;
  });
};
const JUMP_ROUTES = jumpRoutes(ROUTES);

/** One registered "g then …" shortcut. A component per jump, so each is a hook call of its own. */
function GoShortcut({ route, keys }: { route: Route; keys: string }) {
  const navigate = useNavigate();
  useShortcut({ id: `go:${route.path}`, keys, description: `Go to ${routeTitle(route)}`, scope: 'Go to', handler: () => navigate(route.path) });
  return null;
}

export interface CommandMenuProps {
  /** The shortcuts overlay's state: the Help menu opens it too. */
  helpOpen: boolean;
  onHelpOpenChange: (open: boolean) => void;
  /** Start with the palette open, with this query (gallery and tests). */
  initialQuery?: string;
  defaultOpen?: boolean;
}

/** The ⌘K button in the header, the palette, the global shortcuts and the ? overlay. */
export function CommandMenu({ helpOpen, onHelpOpenChange, initialQuery = '', defaultOpen = false }: CommandMenuProps) {
  const [open, setOpen] = useState(defaultOpen);
  const can = useCan();
  useShortcut({ id: 'palette.open', keys: 'mod+k', description: 'Open the command palette', handler: () => setOpen((o) => !o), allowInInputs: true });
  return (
    <>
      <Tooltip content="Search pages, records and actions" shortcut="mod+k">
        <Button variant="secondary" icon="search" onClick={() => setOpen(true)}>
          <span>Search</span> <Kbd keys="mod+k" />
        </Button>
      </Tooltip>
      {JUMP_ROUTES.filter((route) => GO_KEYS[route.path] && can(route.guard)).map((route) => (
        <GoShortcut key={route.path} route={route} keys={GO_KEYS[route.path] as string} />
      ))}
      {open ? <Palette initialQuery={initialQuery} onClose={() => setOpen(false)} onShowShortcuts={() => onHelpOpenChange(true)} /> : null}
      <ShortcutHelp open={helpOpen} onOpenChange={onHelpOpenChange} />
    </>
  );
}

/** The palette's data: mounted only while it's open, so a closed palette reads nothing. */
function Palette({ initialQuery, onClose, onShowShortcuts }: { initialQuery: string; onClose: () => void; onShowShortcuts: () => void }) {
  const app = useAppSession();
  const can = useCan();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [recent, remember] = useRecentItems();
  const searching = query.trim().length >= MIN_SEARCH_LENGTH;
  const records = useRecordSearch(query, { enabled: can('record:read') });
  const accounts = useAccounts();
  const people = usePeople();

  const open = (item: RecentItem) => {
    remember(item);
    navigate(item.href);
  };

  const pages: CommandItem[] = JUMP_ROUTES.filter((route) => can(route.guard)).map((route) => ({
    id: `route:${route.path}`,
    label: routeTitle(route),
    description: 'Page',
    icon: SECTION_ICONS[`/${route.path.split('/')[1] ?? ''}`] ?? 'file',
    keywords: [route.path],
    ...(GO_KEYS[route.path] ? { shortcut: GO_KEYS[route.path] } : {}),
    onSelect: () => open({ kind: 'page', id: route.path, href: route.path }),
  }));

  const recordItems: CommandItem[] =
    searching && can('record:read')
      ? (records.data?.items ?? []).map((record) => ({
          id: `record:${record.id}`,
          label: record.name,
          description: `Record · ${STATUS[record.status].label}`,
          icon: 'file',
          onSelect: () => open({ kind: 'record', id: record.id, href: `/records/${record.id}` }),
        }))
      : [];
  const accountItems: CommandItem[] = can('account:read')
    ? (accounts.data ?? []).map((account) => ({
        id: `account:${account.id}`,
        label: account.name,
        description: `Account · ${account.domain}`,
        icon: 'building',
        onSelect: () => open({ kind: 'account', id: account.id, href: `/accounts/${account.id}` }),
      }))
    : [];
  const personItems: CommandItem[] = can('record:read')
    ? (people.data ?? []).map((person) => ({
        id: `person:${person.id}`,
        label: person.name,
        description: `Person · ${person.email}`,
        icon: 'users',
        onSelect: () => open({ kind: 'person', id: person.id, href: `/people/${person.id}` }),
      }))
    : [];

  const actions: CommandItem[] = [
    ...PALETTE_ACTIONS.filter((action) => can(action.capability)).map((action) => ({
      id: action.id,
      label: action.label,
      ...(action.keywords ? { keywords: action.keywords } : {}),
      ...(action.icon ? { icon: action.icon } : {}),
      onSelect: () => navigate(action.href),
    })),
    ...sessionActions(app, navigate),
    { id: 'action:shortcuts', label: 'Keyboard shortcuts', keywords: ['help', 'keys'], shortcut: '?', onSelect: onShowShortcuts },
  ];

  const recentItems = useRecentRows(recent, [...pages, ...accountItems, ...personItems], open);

  const groups: CommandGroup[] = query.trim()
    ? [
        { id: 'pages', label: 'Jump to', items: pages },
        { id: 'records', label: 'Records', items: recordItems, filter: 'none' },
        { id: 'accounts', label: 'Accounts', items: accountItems },
        { id: 'people', label: 'People', items: personItems },
        { id: 'actions', label: 'Actions', items: actions },
      ]
    : [
        { id: 'recent', label: 'Recent', items: recentItems },
        { id: 'pages', label: 'Jump to', items: pages },
        { id: 'actions', label: 'Actions', items: actions },
      ];

  return (
    <CommandPalette
      defaultOpen
      onOpenChange={(next) => (next ? undefined : onClose())}
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      loading={searching && records.isFetching}
      placeholder="Search records, accounts, people, pages and actions…"
    />
  );
}

/** Switch workspace and sign out: the account menu's items, through the same session functions. */
const sessionActions = (app: AppSession, navigate: (href: string) => void): CommandItem[] => [
  ...app.memberships
    .filter((m) => m.tenant !== app.tenant)
    .map((m) => ({
      id: `action:switch:${m.tenant}`,
      label: `Switch to ${WORKSPACES[m.tenant].name}`,
      keywords: ['workspace'],
      onSelect: () => {
        app.switchTenant(m.tenant);
        navigate('/home');
      },
    })),
  { id: 'action:sign-out', label: 'Sign out', keywords: ['log out'], onSelect: () => void app.signOut() },
];

/**
 * Recents as rows, their names joined now: pages from the route table, accounts and people from
 * their directories, records from their cached (or fetched) detail. Anything this person can no
 * longer see simply drops out.
 */
function useRecentRows(recent: readonly RecentItem[], known: readonly CommandItem[], open: (item: RecentItem) => void): CommandItem[] {
  const tenant = useTenant();
  const partition = usePartition();
  const can = useCan();
  const recordIds = recent.filter((r) => r.kind === 'record').map((r) => r.id);
  const records = useQueries({
    queries: recordIds.map((id) => ({
      queryKey: recordKeys.detail(partition, id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getRecord(tenant, id, signal),
      enabled: can('record:read'),
    })),
  });
  return recent.flatMap((item): CommandItem[] => {
    if (item.kind !== 'record') {
      const found = known.find((row) => row.id === `${item.kind === 'page' ? 'route' : item.kind}:${item.id}`);
      return found ? [{ ...found, id: `recent:${found.id}` }] : [];
    }
    const record = records[recordIds.indexOf(item.id)]?.data;
    return record
      ? [{ id: `recent:record:${record.id}`, label: record.name, description: `Record · ${STATUS[record.status].label}`, icon: 'file', onSelect: () => open(item) }]
      : [];
  });
}
