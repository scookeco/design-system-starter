/**
 * Job endpoints: long-running work (a bulk delete over "all matching") as data. Starting one answers
 * 202 with the job, queued; its status is read back until it ends. Transport only; polling and the
 * cache policy live in src/app/model/jobs.ts.
 */
import { z } from 'zod';
import { request } from './client';
import { JobSchema, JobsSchema, type RecordFilter, type Tenant } from './schemas';

const base = (tenant: Tenant) => `/t/${tenant}/jobs`;

/** The signed-in person's jobs in this workspace: running ones and the ones they haven't dismissed. */
export const listJobs = (tenant: Tenant, signal?: AbortSignal) => request(JobsSchema, base(tenant), { signal });

/** Delete everything matching a filter, or these ids (a retry of the ones that failed), as a job. */
export const postBulkDeleteJob = (tenant: Tenant, selection: { filter: RecordFilter; label: string } | { ids: readonly string[]; label: string }) =>
  request(JobSchema, `${base(tenant)}/bulk-delete`, { method: 'POST', body: selection });

/** Stop between chunks: what's done stays done, and the job says how far it got. */
export const postCancelJob = (tenant: Tenant, id: string) => request(JobSchema, `${base(tenant)}/${encodeURIComponent(id)}/cancel`, { method: 'POST' });

/** Hide a finished job from the list (it stays on record on the server). */
export const deleteJob = (tenant: Tenant, id: string) => request(z.object({ dismissed: z.string() }), `${base(tenant)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
