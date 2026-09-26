/**
 * The mock job runner. A real server's worker moves a job along on its own; this one moves it one
 * chunk each time the jobs are read (every poll), so progress is real (records are deleted chunk by
 * chunk, and ones on legal hold fail) and fully deterministic. Stories seed jobs in any state,
 * paused, for still frames (seedJob).
 */
import { JobSchema, type Job, type JobState, type RecordFilter, type Tenant } from '../api/schemas';
import { canDelete, matchesFilter, type SearchableRecord } from '../model/predicates';
import { auditRecord } from './b2b';
import { db, type MockJob } from './db';
import { SEED_EPOCH } from './seed';

/** Items processed per poll. */
export const JOB_CHUNK = 10;

const at = (step: number) => new Date(SEED_EPOCH + step * 1000).toISOString();

export const isActive = (job: Pick<Job, 'state'>) => job.state === 'queued' || job.state === 'running';

/** What the client sees: the job without the server's own bookkeeping (the schema strips unknown keys). */
export const publicJob = (job: MockJob): Job => JobSchema.parse(job);

/** Queue a bulk delete over these ids. Its total is fixed now: it reports against what it set out to do. */
export const queueBulkDelete = (tenant: Tenant, targets: string[], label: string): MockJob => {
  const partition = db(tenant);
  const job: MockJob = {
    id: `${tenant}-job${String(partition.nextJobId)}`,
    kind: 'bulk-delete',
    state: 'queued',
    label,
    total: targets.length,
    done: 0,
    failed: [],
    createdAt: at(0),
    updatedAt: at(0),
    targets,
    dismissed: false,
    paused: false,
  };
  partition.nextJobId += 1;
  partition.jobs.unshift(job);
  return job;
};

/** The ids a filter selects right now, as the list query would (the server joins the owner's name). */
export const idsMatching = (tenant: Tenant, filter: RecordFilter) => {
  const partition = db(tenant);
  const names = new Map(partition.people.map((p) => [p.id, p.name]));
  return partition.records.filter((r) => matchesFilter({ ...r, ownerName: names.get(r.ownerId) ?? '' } satisfies SearchableRecord, filter)).map((r) => r.id);
};

/** One step of work: queued → running, then a chunk of deletes per step, until it ends. */
export const advance = (tenant: Tenant, job: MockJob) => {
  if (!isActive(job) || job.paused) return;
  const partition = db(tenant);
  const step = job.done / JOB_CHUNK + 1;
  if (job.state === 'queued') {
    job.state = 'running';
    job.updatedAt = at(step);
    return;
  }
  for (const id of job.targets.slice(job.done, job.done + JOB_CHUNK)) {
    const record = partition.records.find((r) => r.id === id);
    if (record && !canDelete(record)) job.failed.push({ id, name: record.name, reason: 'on legal hold' });
    else if (record) {
      partition.records = partition.records.filter((r) => r.id !== id);
      auditRecord(tenant, 'record.deleted', record);
    }
    job.done += 1;
    if (job.failAt !== undefined && job.done >= job.failAt) {
      job.state = 'failed';
      job.error = 'The server stopped the job. What was deleted stays deleted; nothing else was touched.';
      break;
    }
  }
  if (job.state === 'running' && job.done >= job.total) job.state = 'succeeded';
  job.updatedAt = at(step + 1);
};

export interface JobSeed {
  state: JobState;
  /** How many of the matching records it set out to delete (the view's drafts by default). */
  total?: number;
  done?: number;
  /** How many of those done failed (legal hold). */
  failures?: number;
  label?: string;
}

/**
 * Put a job in the mock database, paused in the given state (gallery and tests). Its failures are
 * real records on legal hold, so names and reasons read true.
 */
export const seedJob = (tenant: Tenant, seed: JobSeed): MockJob => {
  const partition = db(tenant);
  const held = partition.records.filter((r) => !canDelete(r));
  const total = seed.total ?? 59;
  const done = seed.done ?? (seed.state === 'queued' ? 0 : seed.state === 'running' ? Math.floor(total / 3) : total);
  const job = queueBulkDelete(tenant, partition.records.slice(0, total).map((r) => r.id), seed.label ?? `Delete ${String(total)} drafts`);
  Object.assign(job, {
    state: seed.state,
    done,
    failed: held.slice(0, seed.failures ?? 0).map((r) => ({ id: r.id, name: r.name, reason: 'on legal hold' })),
    paused: true,
    updatedAt: at(3),
    ...(seed.state === 'failed' ? { error: 'The server stopped the job. What was deleted stays deleted; nothing else was touched.' } : {}),
  });
  return job;
};
