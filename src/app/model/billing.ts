/**
 * Billing and usage: keys, reads and the one named mutation. Changing plan is pessimistic and
 * versioned: the server decides (the new plan must fit what's in use), and money moves.
 *
 *   verb         presents                       patches               invalidates
 *   changePlan   pessimistic, versioned,        billing (the answer)  billing
 *                confirmed in a dialog
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBilling, listPlans, postChangePlan, type Billing } from '../api/billing';
import { ApiError } from '../api/client';
import { useGrant, usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';
import { can, DENIAL_REASONS } from './permissions';
import { refetchAfterWrite } from './refetch';

export const billingKeys = {
  billing: (p: Partition) => [...p, 'billing', {}] as const,
  plans: (p: Partition) => [...p, 'plans', {}] as const,
};

export function useBilling() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: billingKeys.billing(partition), queryFn: ({ signal }) => getBilling(tenant, signal) });
}

export function usePlans() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: billingKeys.plans(partition), queryFn: ({ signal }) => listPlans(tenant, signal), select: (data) => data.items });
}

/** changePlan: sent on the billing version it was chosen from; the answer is the new billing. */
export function useChangePlan() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'changePlan'],
    mutationFn: ({ planId, version }: { planId: string; version: number }) => {
      if (!can(grant, 'workspace:manage')) throw new ApiError(403, 'forbidden', DENIAL_REASONS['workspace:manage']);
      return postChangePlan(tenant, planId, version);
    },
    onSuccess: (answer) => refetchAfterWrite(client, billingKeys.billing(partition), () => client.setQueryData<Billing>(billingKeys.billing(partition), answer)),
  });
}
