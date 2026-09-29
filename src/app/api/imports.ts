/**
 * Imports: rows from a CSV, already mapped to record fields by the wizard, sent as one job. The
 * server validates every row again with the same rules (src/app/model/imports.ts) and creates the
 * records chunk by chunk; the job reports what it did like any other (src/app/model/jobs.ts).
 * Transport only.
 */
import { z } from 'zod';
import { request } from './client';
import { JobSchema, type Tenant } from './schemas';

/** One row to import: its row number in the file (the header is row 1) and its cells, by field id, as typed. */
export const ImportRowSchema = z.object({
  row: z.number().int().positive(),
  cells: z.record(z.string(), z.string()),
});
export type ImportRow = z.infer<typeof ImportRowSchema>;

const base = (tenant: Tenant) => `/t/${tenant}/jobs`;

/** Queue an import: 202 with the job, queued. `file` names the job ("Import 236 rows from leases.csv"). */
export const postImportJob = (tenant: Tenant, body: { rows: readonly ImportRow[]; file: string; idempotencyKey: string }) =>
  request(JobSchema, `${base(tenant)}/import`, { method: 'POST', body: { rows: body.rows, file: body.file }, headers: { 'Idempotency-Key': body.idempotencyKey } });

/** Retry what a finished job couldn't do, as a new job (the server kept the rows). */
export const postRetryJob = (tenant: Tenant, id: string) => request(JobSchema, `${base(tenant)}/${encodeURIComponent(id)}/retry`, { method: 'POST' });
