/**
 * The session: who is signed in, and their membership (role and capabilities) in each workspace.
 * A product loads it once at start (GET /api/session, parsed like any response) and mounts the app
 * with it; stories and tests hand it over ready-made, so nothing waits on it.
 *
 * Every permission question goes through `can` (src/app/model/permissions.ts) with the grant for
 * the active workspace. Nothing here, or anywhere in the client, looks at a role name to decide.
 */
import { createContext, useCallback, useContext, useId, type ReactNode } from 'react';
import type { Capability, Session } from './api/schemas';
import { can, DENIAL_REASONS, type Grant } from './model/permissions';
import { useTenant } from './tenant';

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession needs a SessionProvider (AppProviders) above it.');
  return session;
}

/** For shared chrome that also renders outside the app layer (static example pages): null there. */
export const useOptionalSession = () => useContext(SessionContext);

/** No membership in a workspace means no capabilities in it: deny by default. */
const NO_GRANT: Grant = { capabilities: [] };

/** The grant for the active workspace: its membership, or nothing at all. */
export function useGrant(): Grant {
  const tenant = useTenant();
  return useSession().memberships.find((m) => m.tenant === tenant) ?? NO_GRANT;
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
