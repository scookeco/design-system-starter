/**
 * Long-running jobs, shown truthfully (src/app/model/jobs.ts), composed from system components:
 *
 *   JobsIndicator   in the shell's header on every page, so a job's progress survives navigation:
 *                   "1 job running", opening a popover with every job
 *   JobBanner       on the list, for the latest job: Progress with the count in words, then
 *                   what to do next (Cancel while it runs; Retry failed, Dismiss once it ends)
 *
 * The words follow the job's state, never ahead of it: "Queued", "20 of 59", "57 done, 2 failed",
 * "Stopped after 30 of 59", "Cancelled after 20 of 59".
 */
import { Banner, Button, Cluster, Popover, Progress, Stack, Text, useFormat, type BannerTone } from '../index';
import type { Job } from '../app/api/schemas';
import { isActiveJob, jobProgressText } from '../app/model/jobs';
import { useCancelJob, useDismissJob, useStartBulkDelete } from '../app/model/mutations';
import { useJobs } from '../app/model/queries';
import { useCan } from '../app/session';

const STATE_TITLE: Record<Job['state'], (job: Job) => string> = {
  queued: () => 'Queued',
  running: () => 'Running',
  succeeded: (job) => (job.failed.length > 0 ? 'Finished, with failures' : 'Finished'),
  failed: () => 'Stopped',
  cancelled: () => 'Cancelled',
};

const TONE: Record<Job['state'], (job: Job) => BannerTone> = {
  queued: () => 'info',
  running: () => 'info',
  succeeded: (job) => (job.failed.length > 0 ? 'warning' : 'success'),
  failed: () => 'danger',
  cancelled: () => 'info',
};

/** One job: its progress, what went wrong, and what can be done about it. */
function JobDetails({ job }: { job: Job }) {
  const format = useFormat();
  return (
    <Stack gap="xs">
      <Progress label={job.label} value={job.done} max={Math.max(job.total, 1)} valueText={jobProgressText(job, format)} />
      {job.error ? <Text size="caption">{job.error}</Text> : null}
      {job.state === 'cancelled' ? <Text size="caption">What was deleted before you cancelled stays deleted; nothing else was touched.</Text> : null}
      {job.failed.length > 0 ? (
        <Stack as="ul" gap="2xs">
          {job.failed.slice(0, 3).map((failure) => (
            <li key={failure.id}>
              <Text size="caption">{`${failure.name}: ${failure.reason}`}</Text>
            </li>
          ))}
          {job.failed.length > 3 ? (
            <li>
              <Text size="caption">{`and ${format.number(job.failed.length - 3)} more`}</Text>
            </li>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}

/** Cancel while it runs (safe: it stops between chunks); Retry failed and Dismiss once it ends. */
function JobActions({ job }: { job: Job }) {
  const format = useFormat();
  const can = useCan();
  const cancel = useCancelJob();
  const dismiss = useDismissJob();
  const retry = useStartBulkDelete();
  if (isActiveJob(job)) {
    return can('record:delete') ? (
      <Button variant="secondary" size="sm" loading={cancel.isPending} onClick={() => cancel.mutate(job.id)}>
        Cancel job
      </Button>
    ) : null;
  }
  const failed = job.failed.length;
  return (
    <Cluster gap="xs">
      {failed > 0 && can('record:delete') ? (
        <Button
          variant="secondary"
          size="sm"
          loading={retry.isPending}
          onClick={() => retry.mutate({ ids: job.failed.map((f) => f.id), label: `Retry ${format.number(failed)} failed ${failed === 1 ? 'deletion' : 'deletions'}` })}
        >
          {`Retry ${format.number(failed)} failed`}
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" loading={dismiss.isPending} onClick={() => dismiss.mutate(job.id)}>
        Dismiss
      </Button>
    </Cluster>
  );
}

/** The latest job, above the list it works on. Nothing when there's none. */
export function JobBanner() {
  const jobs = useJobs();
  const job = jobs.data?.[0];
  if (!job) return null;
  return (
    <Banner tone={TONE[job.state](job)} title={STATE_TITLE[job.state](job)} action={<JobActions job={job} />}>
      <JobDetails job={job} />
    </Banner>
  );
}

export interface JobsIndicatorProps {
  /** Open the popover on first render (gallery and tests). */
  defaultOpen?: boolean;
}

/** In the shell's header: the person's jobs, on every page. Nothing when there are none. */
export function JobsIndicator({ defaultOpen = false }: JobsIndicatorProps) {
  const format = useFormat();
  const jobs = useJobs();
  const items = jobs.data ?? [];
  if (items.length === 0) return null;
  const running = items.filter(isActiveJob).length;
  return (
    <Popover
      label="Jobs"
      align="end"
      defaultOpen={defaultOpen}
      trigger={<Button variant="ghost">{running > 0 ? `${format.number(running)} ${running === 1 ? 'job' : 'jobs'} running` : 'Jobs'}</Button>}
    >
      <Stack as="ul" gap="md">
        {items.map((job) => (
          <Stack as="li" gap="xs" key={job.id}>
            <Text size="caption" tone="muted">
              {STATE_TITLE[job.state](job)}
            </Text>
            <JobDetails job={job} />
            <JobActions job={job} />
          </Stack>
        ))}
      </Stack>
    </Popover>
  );
}
