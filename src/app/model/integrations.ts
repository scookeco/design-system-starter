/**
 * Integrations: keys (under the partition), the catalogue read and the named mutations. Every write
 * is pessimistic: the server connects (or refuses), and the page says so only once it has.
 *
 *   verb                       presents                      patches               invalidates
 *   connectIntegration         pessimistic                   the catalogue entry   the catalogue, onboarding
 *   disconnectIntegration      pessimistic, confirmed        the catalogue entry   the catalogue, onboarding
 *   updateIntegrationSettings  pessimistic, versioned        the catalogue entry   the catalogue
 *                              (If-Match; a 409 says someone else changed them)
 *
 * Every write refuses without workspace:manage before any request, like the server.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { listIntegrations, patchIntegrationSettings, postConnect, postDisconnect, type Integration, type IntegrationSettings } from '../api/integrations';
import { useGrant, usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';
import { onboardingKeys } from './onboarding';
import { can, DENIAL_REASONS, type Grant } from './permissions';
import { refetchAfterWrite } from './refetch';

export const integrationKeys = {
  list: (p: Partition) => [...p, 'integrations', {}] as const,
};

/** The capability every integration write needs: setting the workspace up. */
export const INTEGRATIONS_CAPABILITY = 'workspace:manage' as const;

/** Settings a newly connected app starts with. */
export const DEFAULT_SETTINGS: IntegrationSettings = { frequency: 'hourly', direction: 'one-way' };

export function useIntegrations() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: integrationKeys.list(partition), queryFn: ({ signal }) => listIntegrations(tenant, signal), select: (data) => data.items });
}

const refuseUnless = (grant: Grant) => {
  if (!can(grant, INTEGRATIONS_CAPABILITY)) throw new ApiError(403, 'forbidden', DENIAL_REASONS[INTEGRATIONS_CAPABILITY]);
};

/** Put the server's answer in the catalogue, then read it again (and whatever else the write changes). */
const settle = (client: QueryClient, partition: Partition, answer: Integration, alsoOnboarding: boolean) =>
  Promise.all([
    refetchAfterWrite(client, integrationKeys.list(partition), () =>
      client.setQueryData<{ items: Integration[] }>(integrationKeys.list(partition), (data) => (data ? { items: data.items.map((i) => (i.id === answer.id ? answer : i)) } : data)),
    ),
    // "Connect an app" is a step of the first-run checklist.
    ...(alsoOnboarding ? [refetchAfterWrite(client, onboardingKeys.state(partition))] : []),
  ]);

function useIntegrationWrite<V>(name: string, write: (tenant: ReturnType<typeof useTenant>, variables: V) => Promise<Integration>, touchesOnboarding: boolean) {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, name],
    mutationFn: (variables: V) => {
      refuseUnless(grant);
      return write(tenant, variables);
    },
    onSuccess: (answer) => settle(client, partition, answer, touchesOnboarding),
  });
}

/** connectIntegration: connect an app with the default settings. */
export const useConnectIntegration = () => useIntegrationWrite('connectIntegration', (tenant, id: string) => postConnect(tenant, id), true);

/** disconnectIntegration: stop syncing and drop its settings. Confirmed first: the settings don't come back. */
export const useDisconnectIntegration = () => useIntegrationWrite('disconnectIntegration', (tenant, id: string) => postDisconnect(tenant, id), true);

/** updateIntegrationSettings: versioned. A 409 means someone changed them since this page read them. */
export const useUpdateIntegrationSettings = () =>
  useIntegrationWrite(
    'updateIntegrationSettings',
    (tenant, { id, settings, version }: { id: string; settings: IntegrationSettings; version: number }) => patchIntegrationSettings(tenant, id, settings, version),
    false,
  );
