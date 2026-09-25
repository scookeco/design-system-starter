/**
 * The API contract, as schemas. Every response is parsed against one of these at the boundary
 * (see client.ts) before it can reach the cache, so the rest of the app trusts its data and
 * carries no defensive `?.` chains. Entity types are inferred from here once and never restated.
 */
import { z } from 'zod';

export const TENANTS = ['acme', 'globex'] as const;
export const TenantSchema = z.enum(TENANTS);
export type Tenant = z.infer<typeof TenantSchema>;

/** A record's lifecycle: draft → pending → active, with overdue and archived branches. */
export const RECORD_STATUSES = ['draft', 'pending', 'active', 'overdue', 'archived'] as const;
export const RecordStatusSchema = z.enum(RECORD_STATUSES);
export type RecordStatus = z.infer<typeof RecordStatusSchema>;

/** Money travels as integer minor units with an ISO 4217 code. Never a float. */
export const MoneySchema = z.object({
  minor: z.number().int(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
export type Money = z.infer<typeof MoneySchema>;

export const PersonSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });
export type Person = z.infer<typeof PersonSchema>;

export const RecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  owner: PersonSchema,
  status: RecordStatusSchema,
  amount: MoneySchema,
  /** An instant (ISO 8601 with zone). */
  updatedAt: z.iso.datetime({ offset: true }),
  /** A calendar date with no zone. */
  renewsOn: z.iso.date(),
  tags: z.array(z.string()),
  /** Bumped on every write. Sent back with an edit so the server can refuse a stale one (409). */
  version: z.number().int().nonnegative(),
});
export type RecordEntity = z.infer<typeof RecordSchema>;

/** One page of a server-side query, with the total that matches it (not just this page). */
export const RecordPageSchema = z.object({
  items: z.array(RecordSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type RecordPage = z.infer<typeof RecordPageSchema>;

export const PeopleSchema = z.object({ items: z.array(PersonSchema) });

export const BulkDeleteResultSchema = z.object({
  deleted: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), name: z.string(), reason: z.string() })),
});
export type BulkDeleteResult = z.infer<typeof BulkDeleteResultSchema>;

export const ErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** On a 409: the record as the server has it now. */
    current: RecordSchema.optional(),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

/** The list's tabs. Each is a named predicate in src/app/model; the server counts the same ones. */
export const RECORD_VIEWS = ['all', 'open', 'drafts', 'archived'] as const;
export const RecordViewSchema = z.enum(RECORD_VIEWS);
export type RecordView = z.infer<typeof RecordViewSchema>;

export const RecordCountsSchema = z.object({ counts: z.record(RecordViewSchema, z.number().int().nonnegative()) });
export type RecordCounts = z.infer<typeof RecordCountsSchema>['counts'];

export const SORT_KEYS = ['name', '-name', 'amount', '-amount', 'updated', '-updated'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** What a list query asks for: search, filters, sort and page. Also the list's cache-key params. */
export interface RecordQuery {
  q: string;
  status: readonly RecordStatus[];
  view: RecordView;
  sort: SortKey;
  page: number;
  pageSize: number;
}

/** A filter without paging or sort: what "Select all N matching" selects, and what counts count. */
export type RecordFilter = Pick<RecordQuery, 'q' | 'status' | 'view'>;
