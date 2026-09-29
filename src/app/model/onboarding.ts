/**
 * The first-run checklist on the dashboard: its key, its read and its named mutations. Only people
 * who set the workspace up (workspace:manage) see it; the steps are worked out on the server from
 * the workspace (a member invited, an import finished, an app connected).
 *
 *   verb                presents                           patches        invalidates
 *   dismissOnboarding   pessimistic, undoable (a toast's   the checklist  the checklist
 *                       Undo sends restoreOnboarding)
 *   restoreOnboarding   pessimistic                        the checklist  the checklist
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { getOnboarding, patchOnboarding, type Onboarding } from '../api/onboarding';
import { useGrant, usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';
import { can, DENIAL_REASONS } from './permissions';
import { refetchAfterWrite } from './refetch';

export const onboardingKeys = {
  state: (p: Partition) => [...p, 'onboarding', {}] as const,
};

/** The checklist, for people who can set the workspace up; nothing is fetched for anyone else. */
export function useOnboarding() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  return useQuery({ queryKey: onboardingKeys.state(partition), queryFn: ({ signal }) => getOnboarding(tenant, signal), enabled: can(grant, 'workspace:manage') });
}

function useSetDismissed(name: string, dismissed: boolean) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, name],
    mutationFn: () => {
      if (!can(grant, 'workspace:manage')) throw new ApiError(403, 'forbidden', DENIAL_REASONS['workspace:manage']);
      return patchOnboarding(tenant, dismissed);
    },
    onSuccess: (answer) => refetchAfterWrite(client, onboardingKeys.state(partition), () => client.setQueryData<Onboarding>(onboardingKeys.state(partition), answer)),
  });
}

/** dismissOnboarding: hide the checklist. Reversible, so it offers Undo rather than asking first. */
export const useDismissOnboarding = () => useSetDismissed('dismissOnboarding', true);
/** restoreOnboarding: bring it back (Undo, or from a later visit). */
export const useRestoreOnboarding = () => useSetDismissed('restoreOnboarding', false);
