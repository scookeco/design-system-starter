/**
 * Gallery wiring for stories that read from the mock API. Each story gets a fresh database and a
 * fresh cache, so no story sees another's writes, and a signal on <html> tells the visual suite
 * when the data has settled.
 */
import { QueryClient, type QueryClient as QueryClientType } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import type { Decorator } from '@storybook/react-vite';
import { addons } from 'storybook/preview-api';
import type { HttpHandler } from 'msw';
import { ROLES, type Job, type Role, type Session, type Tenant } from '../api/schemas';
import { draftStorage } from '../model/drafts';
import { isActiveJob, jobSettings } from '../model/jobs';
import { undoSettings } from '../model/undo';
import { writeQueues } from '../model/writeQueue';
import { AppProviders } from '../providers';
import { createMemoryHistory, type MemoryHistory } from '../url/history';
import { currentSession, resetDb, setRoles } from './db';
import { aiHandlers } from './ai';
import { handlers } from './handlers';
import { seedJob, type JobSeed } from './jobs';
import { anotherUser, mockLive, type AnotherUserChange } from './live';

/** Storybook's own event for changing a global (core-events' UPDATE_GLOBALS; its module path is internal). */
const UPDATE_GLOBALS = 'updateGlobals';

/**
 * Settled: at least one query exists, nothing is fetching or mutating, and some query has an
 * answer (data or error). This also covers the gap before the first fetch starts, and refetches
 * after a mutation invalidates. Written as html[data-queries-settled].
 */
const isSettled = (client: QueryClientType) => {
  const queries = client.getQueryCache().getAll();
  return (
    queries.length > 0 &&
    queries.every((q) => q.state.fetchStatus === 'idle') &&
    queries.some((q) => q.state.status !== 'pending') &&
    // A write held in its undo window is waiting on the person, not the server: that's settled.
    client.isMutating() === writeQueues(client).heldCount() &&
    // A story that polls its jobs has settled when they've ended.
    !(Number.isFinite(jobSettings.pollMs) && client.getQueryCache().findAll({ queryKey: [], predicate: (q) => q.queryKey[2] === 'jobs' }).some((q) => (q.state.data as { items: Job[] } | undefined)?.items.some(isActiveJob)))
  );
};

/**
 * Also plays the story's scripted changes by another user (`mockApi({ anotherUser })`), once, the
 * first time the page's own queries settle: the page has loaded, then the colleague's change
 * arrives. The signal stays false until they've been delivered and whatever they invalidated has
 * refetched, so a screenshot always shows the reconciled page.
 */
/** How long the page must stay settled before a scripted change lands. */
const SCRIPT_QUIET_MS = 150;

function SettledSignal({ client, tenant, script }: { client: QueryClientType; tenant: Tenant; script: readonly AnotherUserChange[] }) {
  useEffect(() => {
    let pending = script.length > 0;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const play = () => {
      quiet = undefined;
      if (!pending || !isSettled(client)) return;
      pending = false;
      for (const change of script) anotherUser(tenant, change);
      update();
    };
    const update = () => {
      // The script waits for a quiet moment, not the first settle: a page that loads in stages (the
      // record, then the form's owners and accounts) must be fully on screen before the change lands.
      if (pending && isSettled(client) && !quiet) quiet = setTimeout(play, SCRIPT_QUIET_MS);
      document.documentElement.dataset.queriesSettled = String(!pending && isSettled(client));
    };
    update();
    const unsubscribeQueries = client.getQueryCache().subscribe(update);
    const unsubscribeMutations = client.getMutationCache().subscribe(update);
    return () => {
      clearTimeout(quiet);
      unsubscribeQueries();
      unsubscribeMutations();
      delete document.documentElement.dataset.queriesSettled;
    };
  }, [client, tenant, script]);
  return null;
}

/** The gallery's "Another user…" toolbar: one change per pick, on the record the page shows (or the list's first row). */
const TOOLBAR_CHANGES = ['edit', 'add', 'delete'] as const;
type ToolbarChange = (typeof TOOLBAR_CHANGES)[number];
const isToolbarChange = (value: unknown): value is ToolbarChange => (TOOLBAR_CHANGES as readonly unknown[]).includes(value);

function ToolbarChanges({ tenant, history, pushed, onPushed }: { tenant: Tenant; history: MemoryHistory; pushed: unknown; onPushed: () => void }) {
  const push = useEffectEvent((change: ToolbarChange) => {
    const onRecord = /^\/records\/([^/]+)/.exec(history.location().pathname)?.[1];
    const id = onRecord && onRecord !== 'new' ? onRecord : undefined;
    anotherUser(tenant, change === 'add' ? { kind: 'add' } : { kind: change, ...(id ? { id } : {}) });
    onPushed();
  });
  // Once per pick: the toolbar then goes back to "none", ready for the next one.
  useEffect(() => {
    if (isToolbarChange(pushed)) push(pushed);
  }, [pushed]);
  return null;
}

/** Stories never retry and never go stale: a failure shows at once, and nothing refetches mid-capture. */
const storyClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false }, mutations: { retry: false } } });

interface StoryProvidersProps {
  session: Session;
  tenant: Tenant;
  url: string;
  script: readonly AnotherUserChange[];
  pushed: unknown;
  onPushed: () => void;
  children: ReactNode;
}

function StoryProviders({ session, tenant, url, script, pushed, onPushed, children }: StoryProvidersProps) {
  const [client] = useState(storyClient);
  const [history] = useState(() => createMemoryHistory(url));
  return (
    <AppProviders session={session} tenant={tenant} queryClient={client} history={history} live={mockLive}>
      <SettledSignal client={client} tenant={tenant} script={script} />
      <ToolbarChanges tenant={tenant} history={history} pushed={pushed} onPushed={onPushed} />
      {children}
    </AppProviders>
  );
}

export interface MockApiParameters {
  /** The workspace the story runs in (default acme). */
  tenant?: Tenant;
  /**
   * The signed-in person's role, in every workspace or per workspace. Wins over the gallery's Role
   * toolbar, so a story about a role always shows that role (the visual suite pins the toolbar to admin).
   */
  role?: Role | Partial<Record<Tenant, Role>>;
  /** The URL the page opens at, kept in an in-memory history so the gallery's own URL is never rewritten. */
  url?: string;
  /**
   * Changes another person makes once the page has loaded, delivered through the live channel
   * (in order, before the settled signal). Deterministic: the same changes at the same moment.
   */
  anotherUser?: readonly AnotherUserChange[];
  /** The undo window: 'hold' keeps it open (the toast and the held write stay), a number shortens it. Default 6 s. */
  undoWindow?: 'hold' | number;
  /** Jobs already in the person's list when the page opens, each paused in its state (a still frame). */
  jobs?: readonly JobSeed[];
  /**
   * Poll running jobs every this many ms, so they advance and finish (the story settles once none is
   * running). Off by default: a seeded job is a still frame.
   */
  pollJobs?: number;
}

const NO_SCRIPT: readonly AnotherUserChange[] = [];

const toolbarRole = (value: unknown): Role => (ROLES as readonly unknown[]).includes(value) ? (value as Role) : 'admin';

/**
 * Wraps a story in the app providers, from its `parameters.mockApi`. The role goes to the mock
 * server first (it's the server that decides), and the session the app mounts with is the one the
 * server would return for it.
 */
const withMockApi: Decorator = (Story, context) => {
  const { tenant = 'acme', url = '/', role, anotherUser: script = NO_SCRIPT, undoWindow = 6_000, pollJobs } = (context.parameters.mockApi ?? {}) as MockApiParameters;
  undoSettings.windowMs = undoWindow === 'hold' ? Infinity : undoWindow;
  jobSettings.pollMs = pollJobs ?? Infinity;
  setRoles(role ?? toolbarRole(context.globals.role));
  return (
    <StoryProviders
      session={currentSession()}
      tenant={tenant}
      url={url}
      script={script}
      pushed={context.globals.anotherUser}
      // Back to "none" (as the toolbar would), ready for the next pick.
      onPushed={() => addons.getChannel().emit(UPDATE_GLOBALS, { globals: { anotherUser: 'none' } })}
    >
      <Story />
    </StoryProviders>
  );
};

/**
 * Meta fields for a story file that reads from the mock API: the providers, the handlers, and a
 * reset database before each story. Spread it into the meta, and write the tags out literally
 * beside it (Storybook's indexer reads tags statically, so a spread can't carry them):
 *
 *   tags: ['!autodocs', 'data']   the visual suite waits for html[data-queries-settled="true"]
 *   tags: ['busy']                on a story that holds a request open on purpose: don't wait
 */
export const mockApiMeta = {
  decorators: [withMockApi],
  // `overrides` comes first so a story's overrides (parameters.msw.handlers.overrides) win over the defaults.
  // The assistant's routes (./ai) sit beside the rest; they import the same route wrapper, so they live in their own module.
  parameters: { layout: 'fullscreen', msw: { handlers: { overrides: [], api: [...handlers, ...aiHandlers] } } },
  beforeEach: (context: { parameters: { mockApi?: MockApiParameters } }) => {
    resetDb();
    // Drafts autosave to this browser's storage: every story starts with none.
    draftStorage.clearAll();
    const { tenant = 'acme', jobs = [] } = context.parameters.mockApi ?? {};
    // Seeded newest first, as the server lists them: the first seed is the latest job.
    for (const job of [...jobs].reverse()) seedJob(tenant, job);
  },
};

/** Story parameters that put these handlers in front of the defaults. */
export const mswOverrides = (...overrides: HttpHandler[]) => ({ msw: { handlers: { overrides } } });

/** Story parameters: open the page at this URL, in this tenant. */
export const mockApi = (settings: MockApiParameters) => ({ mockApi: settings });
