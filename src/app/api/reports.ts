/**
 * Reports: aggregates the server computes over the records this person may see (a viewer's have
 * no drafts), in the workspace's currency. The page draws them as charts, each with its numbers as
 * a table. Transport only.
 */
import { z } from 'zod';
import { request } from './client';
import { MoneySchema, type Tenant } from './schemas';

export const REPORT_HORIZONS = [6, 12] as const;
export type ReportHorizon = (typeof REPORT_HORIZONS)[number];

export const ReportSchema = z.object({
  /** Records that aren't archived, counted per status, in the statuses' order. */
  byStatus: z.array(z.object({ status: z.enum(['draft', 'pending', 'active', 'overdue']), count: z.number().int().nonnegative() })),
  /** The accounts with the most contract value, largest first, and everything else as one "other" total. */
  byAccount: z.array(z.object({ accountId: z.string().min(1), value: MoneySchema, records: z.number().int().nonnegative() })),
  otherAccounts: z.object({ value: MoneySchema, records: z.number().int().nonnegative(), accounts: z.number().int().nonnegative() }),
  /** Renewals per calendar month from this month on, `horizon` months long, including empty months. */
  renewals: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), value: MoneySchema, count: z.number().int().nonnegative() })),
  horizon: z.union([z.literal(6), z.literal(12)]),
});
export type Report = z.infer<typeof ReportSchema>;

export const getReport = (tenant: Tenant, horizon: ReportHorizon, signal?: AbortSignal) => request(ReportSchema, `/t/${tenant}/reports?horizon=${String(horizon)}`, { signal });
