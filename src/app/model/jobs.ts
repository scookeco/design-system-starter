/**
 * Long-running jobs, on the client: truthful status, read back from the server until each ends.
 *
 *   start      a bulk action over "all matching" is queued as a job (202 + the job, queued); the
 *              page never says "done" at that point
 *   progress   the person's jobs are one query, polled while any is queued or running, and read
 *              from the app shell, so progress carries on (and is visible) on every page
 *   finish     succeeded (maybe with failed items: a partial failure, each listed with its reason),
 *              failed (the job stopped; what it did stays done) or cancelled (between chunks)
 *   follow-up  as a job deletes records, lists and counts refetch; failed items can be retried
 *              as a new job; a finished job is dismissed when the person has read it
 */
import type { Job } from '../api/schemas';

/** How often running jobs are polled. Stories set Infinity (a still frame); tests shorten it. */
export const jobSettings = { pollMs: 1_000 };

export const isActiveJob = (job: Pick<Job, 'state'>) => job.state === 'queued' || job.state === 'running';

/** A job's progress in words, from its state: what a Progress bar's valueText says. */
export const jobProgressText = (job: Job, format: { number: (n: number) => string }) => {
  const n = format.number;
  const failed = job.failed.length;
  switch (job.state) {
    case 'queued':
      return `Queued · ${n(job.total)} to go`;
    case 'running':
      return `${n(job.done)} of ${n(job.total)}`;
    case 'succeeded':
      return failed > 0 ? `${n(job.done - failed)} done, ${n(failed)} failed` : `All ${n(job.total)} done`;
    case 'failed':
      return `Stopped after ${n(job.done)} of ${n(job.total)}`;
    case 'cancelled':
      return `Cancelled after ${n(job.done)} of ${n(job.total)}`;
  }
};
