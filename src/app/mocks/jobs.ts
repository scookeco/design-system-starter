/**
 * The mock job runner. A real server's worker moves a job along on its own; this one moves it one
 * chunk each time the jobs are read (every poll), so progress is real (records are deleted chunk by
 * chunk, and ones on legal hold fail) and fully deterministic. Stories seed jobs in any state,
 * paused, for still frames (seedJob).
 */
import type { ImportRow } from '../api/imports';
import { JobSchema, type Job, type JobKind, type JobState, type RecordFilter, type Tenant } from '../api/schemas';
import { guessMapping, mapRows, validateImportRow, type ImportContext } from '../model/importRules';
import { parseCsv } from '../model/csv';
import { canDelete, matchesFilter, type SearchableRecord } from '../model/predicates';
import { WORKSPACES } from '../workspaces';
import { auditRecord } from './b2b';
import { currentSession, db, touch, type MockJob } from './db';
import { sampleImportCsv } from './importSample';
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

// ── Demo examples: imports as jobs ─────────────────────────────────────────────────────────────

/** What the import rules need to know about this workspace, as the server sees it. */
export const importContext = (tenant: Tenant): ImportContext => {
  const partition = db(tenant);
  const me = currentSession().user;
  return {
    people: partition.people,
    accounts: partition.accounts,
    currency: WORKSPACES[tenant].currency,
    defaultOwnerId: partition.people.find((p) => p.email === me.email)?.id ?? partition.people[0]?.id ?? '',
    today: new Date(SEED_EPOCH).toISOString().slice(0, 10),
  };
};

/**
 * A row the server fails on its first attempt, whatever it holds: every 13th row "times out", so a
 * partial failure is deterministic and a retry (attempt 2) goes through. A real server's reasons
 * vary; the page only needs to show them and offer Retry.
 */
export const TIMES_OUT_FIRST_TIME = (row: number) => row % 13 === 0;
export const TIMEOUT_REASON = 'The server timed out saving this row. Retrying usually works.';

const rowLabel = (row: ImportRow) => `Row ${String(row.row)}${row.cells.name ? ` · ${row.cells.name}` : ''}`;

/** Queue an import of these rows. Its total is fixed now, like a delete's. */
export const queueImport = (tenant: Tenant, rows: ImportRow[], label: string, attempt = 1, idempotencyKey?: string): MockJob => {
  const job = queueBulkDelete(tenant, rows.map((r) => `row-${String(r.row)}`), label);
  Object.assign(job, { kind: 'import' satisfies JobKind, rows, attempt, ...(idempotencyKey ? { idempotencyKey } : {}) });
  return job;
};

/** One chunk of an import: each row checked again with the same rules as the preview, then created. */
const advanceImport = (tenant: Tenant, job: MockJob) => {
  const partition = db(tenant);
  const context = importContext(tenant);
  for (const row of (job.rows ?? []).slice(job.done, job.done + JOB_CHUNK)) {
    const result = validateImportRow(row, context);
    if ('problems' in result) job.failed.push({ id: `row-${String(row.row)}`, name: rowLabel(row), reason: result.problems.map((p) => p.message).join(' ') });
    else if ((job.attempt ?? 1) === 1 && TIMES_OUT_FIRST_TIME(row.row)) job.failed.push({ id: `row-${String(row.row)}`, name: rowLabel(row), reason: TIMEOUT_REASON });
    else {
      const { amountMinor, ...fields } = result.record;
      const record = touch({
        id: `${tenant === 'acme' ? 'r' : 'g'}-${String(partition.nextId)}`,
        ...fields,
        amount: { minor: amountMinor, currency: context.currency },
        updatedAt: new Date(SEED_EPOCH).toISOString(),
        tags: [],
        version: 0,
      });
      partition.nextId += 1;
      partition.records.unshift(record);
      auditRecord(tenant, 'record.created', record);
    }
    job.done += 1;
  }
};

/** Retry what a finished job couldn't do, as a new job: an import's failed rows (attempt + 1), or a delete's failed ids. */
export const retryJob = (tenant: Tenant, job: MockJob): MockJob => {
  const failed = new Set(job.failed.map((f) => f.id));
  const n = failed.size;
  if (job.kind === 'import') {
    const rows = (job.rows ?? []).filter((r) => failed.has(`row-${String(r.row)}`));
    return queueImport(tenant, rows, `Retry ${String(n)} failed ${n === 1 ? 'row' : 'rows'}`, (job.attempt ?? 1) + 1);
  }
  return queueBulkDelete(tenant, [...failed], `Retry ${String(n)} failed ${n === 1 ? 'deletion' : 'deletions'}`);
};

// ── end Demo examples ──────────────────────────────────────────────────────────────────────────

/** One step of work: queued → running, then a chunk of deletes (or imported rows) per step, until it ends. */
export const advance = (tenant: Tenant, job: MockJob) => {
  if (!isActive(job) || job.paused) return;
  const partition = db(tenant);
  const step = job.done / JOB_CHUNK + 1;
  if (job.state === 'queued') {
    job.state = 'running';
    job.updatedAt = at(step);
    return;
  }
  if (job.kind === 'import') {
    advanceImport(tenant, job);
    if (job.done >= job.total) job.state = 'succeeded';
    job.updatedAt = at(step + 1);
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
  /** A bulk delete (default) or an import of the sample file (src/app/mocks/importSample.ts). */
  kind?: JobKind;
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
export const seedJob = (tenant: Tenant, seed: JobSeed): MockJob => (seed.kind === 'import' ? seedImportJob(tenant, seed) : seedDeleteJob(tenant, seed));

/** An import of the sample file's good rows, paused; its failures are the rows that time out on a first attempt. */
const seedImportJob = (tenant: Tenant, seed: JobSeed): MockJob => {
  const { headers, rows } = parseCsv(sampleImportCsv(tenant));
  const context = importContext(tenant);
  const good = mapRows(rows, guessMapping(headers)).filter((row) => 'record' in validateImportRow(row, context));
  const total = seed.total ?? good.length;
  const done = seed.done ?? (seed.state === 'queued' ? 0 : seed.state === 'running' ? Math.floor(total / 3) : total);
  const job = queueImport(tenant, good.slice(0, total), seed.label ?? `Import ${String(total)} rows from renewals.csv`);
  const timedOut = good.slice(0, done).filter((row) => TIMES_OUT_FIRST_TIME(row.row));
  Object.assign(job, {
    state: seed.state,
    done,
    failed: timedOut.slice(0, seed.failures ?? timedOut.length).map((row) => ({ id: `row-${String(row.row)}`, name: rowLabel(row), reason: TIMEOUT_REASON })),
    paused: true,
    updatedAt: at(3),
    ...(seed.state === 'failed' ? { error: 'The server stopped the import. Records imported so far stay imported.' } : {}),
  });
  return job;
};

const seedDeleteJob = (tenant: Tenant, seed: JobSeed): MockJob => {
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
