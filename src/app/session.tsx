/**
 * The session: who is signed in, and their membership (role and capabilities) in each workspace.
 * A product loads it once at start (GET /api/session, parsed like any response) and mounts the app
 * with it; stories and tests hand it over ready-made, so nothing waits on it.
 *
 * Every permission question goes through `can` (src/app/model/permissions.ts) with the grant for
 * the active workspace. Nothing here, or anywhere in the client, looks at a role name to decide.
 *
 * The boundaries the cache must respect live here too:
 *   switch workspace   in-flight reads of the old workspace are cancelled; its confirmed data stays in
 *                      its own partition (keys lead with the tenant), where the new one can't read it;
 *                      the screen below remounts, so selections and drafts stay behind
 *   permission change  the old scope's partition is dropped: a narrower role never reads what a
 *                      broader one cached, and nothing stale is kept for when access comes back
 *   sign out           every query and mutation is cancelled and the whole cache cleared, before the
 *                      signed-out screen renders; nothing of one person's is left for the next
 */
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { deleteSession, getSession } from './api/session';
import type { Capability, Membership, Session, Tenant } from './api/schemas';
import type { Partition } from './model/keys';
import { can, DENIAL_REASONS, type Grant } from './model/permissions';
import { TenantProvider, useTenant } from './tenant';

export interface AppSession {
  session: Session;
  tenant: Tenant;
  /** The workspaces this person belongs to, with their role in each. */
  memberships: readonly Membership[];
  switchTenant: (tenant: Tenant) => void;
  /** Ask the server again (after a 403: a role may have changed). */
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<AppSession | null>(null);

const sameSession = (a: Session, b: Session) => JSON.stringify(a) === JSON.stringify(b);

export interface SessionProviderProps {
  session: Session;
  tenant: Tenant;
  /** What to render once signed out (a sign-in page). */
  signedOut?: ReactNode;
  children: ReactNode;
}

/** Holds the session and the active workspace, and enforces the cache boundaries between them. */
export function SessionProvider({ session: given, tenant: givenTenant, signedOut = null, children }: SessionProviderProps) {
  const client = useQueryClient();
  const [session, setSession] = useState<Session | null>(given);
  const [tenant, setTenant] = useState<Tenant>(givenTenant);
  // A new session or workspace from outside (a fresh sign-in, the gallery's Role toolbar): follow it.
  const [seen, setSeen] = useState({ given, givenTenant });
  if (!sameSession(seen.given, given) || seen.givenTenant !== givenTenant) {
    setSeen({ given, givenTenant });
    setSession(given);
    setTenant(givenTenant);
  }

  const scope = session?.memberships.find((m) => m.tenant === tenant)?.scope;

  // Permission change: drop the partition the old scope filled. (Keys already keep it unreadable.)
  const previous = useRef<Partition | undefined>(undefined);
  useEffect(() => {
    const before = previous.current;
    previous.current = scope === undefined ? undefined : [tenant, scope];
    if (before && before[0] === tenant && before[1] !== scope) client.removeQueries({ queryKey: [...before] });
  }, [client, tenant, scope]);

  const switchTenant = useCallback(
    (next: Tenant) => {
      if (next === tenant) return;
      // Late answers for the old workspace must not land anywhere the new one can see.
      void client.cancelQueries({ queryKey: [tenant] });
      setTenant(next);
    },
    [client, tenant],
  );

  const refreshSession = useCallback(async () => {
    setSession(await getSession());
  }, []);

  const signOut = useCallback(async () => {
    // Clear first, so nothing private survives even if the server call fails.
    await client.cancelQueries();
    client.getMutationCache().clear();
    client.clear();
    setSession(null);
    await deleteSession().catch(() => undefined);
  }, [client]);

  const value = useMemo<AppSession | null>(
    () => (session ? { session, tenant, memberships: session.memberships, switchTenant, refreshSession, signOut } : null),
    [session, tenant, switchTenant, refreshSession, signOut],
  );

  if (!value) return <>{signedOut}</>;
  return (
    <SessionContext value={value}>
      {/* A tenant switch remounts everything below: selections, drafts and in-flight work stay with the old tenant. */}
      <TenantProvider key={tenant} tenant={tenant}>
        {children}
      </TenantProvider>
    </SessionContext>
  );
}

export function useAppSession(): AppSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useAppSession needs a SessionProvider (AppProviders) above it.');
  return session;
}

export const useSession = (): Session => useAppSession().session;

/** For shared chrome that also renders outside the app layer (static example pages): null there. */
export const useOptionalAppSession = () => useContext(SessionContext);

/** No membership in a workspace means no capabilities in it: deny by default. */
const NO_GRANT: Grant = { capabilities: [] };

/** The membership for the active workspace, if any. */
const useMembership = () => {
  const tenant = useTenant();
  return useSession().memberships.find((m) => m.tenant === tenant);
};

/** The grant for the active workspace: its membership, or nothing at all. */
export function useGrant(): Grant {
  return useMembership() ?? NO_GRANT;
}

/** The cache partition for the active workspace and permission scope. Every key starts with it. */
export function usePartition(): Partition {
  const tenant = useTenant();
  const scope = useMembership()?.scope ?? 'none';
  return useMemo(() => [tenant, scope] as const, [tenant, scope]);
}

/** The permission predicate, bound to the active workspace's grant. */
export function useCan() {
  const grant = useGrant();
  return useCallback((capability: Capability, subject?: Parameters<typeof can>[2]) => can(grant, capability, subject), [grant]);
}

export interface Permission {
  allowed: boolean;
  /** Why not, in words a person can act on. */
  reason: string;
  /** Point a disabled control's aria-describedby here, and render the reason with this id. */
  reasonId: string;
}

/** One check for one control: whether it's allowed, and the reason to show beside it when it isn't. */
export function usePermission(capability: Capability, subject?: Parameters<typeof can>[2]): Permission {
  const allowed = useCan()(capability, subject);
  const reasonId = useId();
  return { allowed, reason: DENIAL_REASONS[capability], reasonId };
}
