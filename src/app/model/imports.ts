/**
 * The CSV import's named mutations. Importing is a job: the wizard never says "imported" until the
 * job does (src/app/model/jobs.ts). The rules a row must pass are in ./importRules.ts.
 *
 *   verb          presents      patches                  invalidates
 *   startImport   pessimistic   jobs (appends, queued)   jobs; the job's polls then refetch lists and counts
 *                 (idempotency key: a retried request never imports twice)
 *   retryJob      pessimistic   jobs (appends the retry) jobs   (the rows that failed, as a new job)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { postImportJob, postRetryJob, type ImportRow } from '../api/imports';
import type { Capability, Job } from '../api/schemas';
import { useGrant, usePartition } from '../session';
import { useTenant } from '../tenant';
import { jobKeys } from './keys';
import { JOB_CAPABILITY } from './jobs';
import { can, DENIAL_REASONS } from './permissions';
import { refetchAfterWrite } from './refetch';

const refuseUnless = (grant: { capabilities: readonly Capability[] }, capability: Capability) => {
  if (!can(grant, capability)) throw new ApiError(403, 'forbidden', DENIAL_REASONS[capability]);
};

type Jobs = { items: Job[] };

const appendJob = (job: Job) => (current: Jobs | undefined): Jobs => ({ items: [job, ...(current?.items ?? []).filter((j) => j.id !== job.id)] });

/** startImport: queue the ready rows as a job. Refused without record:create, before any request. */
export function useStartImport() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'startImport'],
    mutationFn: (body: { rows: readonly ImportRow[]; file: string; idempotencyKey: string }) => {
      refuseUnless(grant, 'record:create');
      return postImportJob(tenant, body);
    },
    // The jobs list may be on its first load (the header's indicator mounts with the page).
    onSuccess: (job) => refetchAfterWrite(client, jobKeys.list(partition), () => client.setQueryData<Jobs>(jobKeys.list(partition), appendJob(job))),
  });
}

/** retryJob: what a finished job couldn't do, as a new job. Asks the capability the job's kind needs. */
export function useRetryJob() {
  const tenant = useTenant();
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, 'retryJob'],
    mutationFn: (job: Pick<Job, 'id' | 'kind'>) => {
      refuseUnless(grant, JOB_CAPABILITY[job.kind]);
      return postRetryJob(tenant, job.id);
    },
    onSuccess: (job) => refetchAfterWrite(client, jobKeys.list(partition), () => client.setQueryData<Jobs>(jobKeys.list(partition), appendJob(job))),
  });
}
