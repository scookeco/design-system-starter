/**
 * The API contract, as schemas. Every response is parsed against one of these at the boundary
 * (see client.ts) before it can reach the cache, so the rest of the app trusts its data and
 * carries no defensive `?.` chains. Entity types are inferred from here once and never restated.
 */
import { z } from 'zod';

export const TENANTS = ['acme', 'globex'] as const;
export const TenantSchema = z.enum(TENANTS);
export type Tenant = z.infer<typeof TenantSchema>;

/**
 * Capabilities: resource:action. Endpoints and UI check these, never role names. Which role holds
 * which is decided in exactly one place (ROLE_CAPABILITIES in src/app/model/permissions.ts).
 */
export const CAPABILITIES = [
  /** Be a member: open the workspace's home and personal settings. */
  'workspace:read',
  /** Set the workspace up and change how it works. */
  'workspace:manage',
  'record:read',
  /** See drafts. Viewers get a narrower projection of the same records: drafts are work in progress. */
  'record:read-drafts',
  'record:create',
  'record:rename',
  'record:move',
  'record:archive',
  'record:delete',
  'account:read',
  'account:create',
  'account:edit',
  'people:create',
  // B2B power features: the admin console.
  /** Invite members, change their roles, remove them. Everyone in the workspace can see who's in it. */
  'members:manage',
  /** Read the workspace's audit log. */
  'audit:read',
] as const;
export const CapabilitySchema = z.enum(CAPABILITIES);
export type Capability = z.infer<typeof CapabilitySchema>;

/** A small ladder, each role holding everything below it. A role is held per workspace (a membership). */
export const ROLES = ['viewer', 'editor', 'admin'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

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

/** Someone in the workspace. Records and accounts point at people by id; a name is never copied onto them. */
export const PersonSchema = z.object({ id: z.string().min(1), name: z.string().min(1), email: z.email() });
export type Person = z.infer<typeof PersonSchema>;

/** A customer organisation. Records belong to an account by id. */
export const AccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().min(1),
  industry: z.string().min(1),
  /** The person who owns the relationship, by id. */
  ownerId: z.string().min(1),
  /** Annual recurring revenue. */
  arr: MoneySchema,
  /** A calendar date with no zone. */
  customerSince: z.iso.date(),
  version: z.number().int().nonnegative(),
});
export type Account = z.infer<typeof AccountSchema>;

export const AccountsSchema = z.object({ items: z.array(AccountSchema) });

export const RecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** References, never copies: the owner and account are joined by id wherever they're shown. */
  ownerId: z.string().min(1),
  accountId: z.string().min(1).nullable(),
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
    /** On a 409: the entity as the server has it now. */
    current: z.union([RecordSchema, AccountSchema]).optional(),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

/** The signed-in person, as the identity provider knows them. */
export const UserSchema = z.object({ id: z.string().min(1), name: z.string().min(1), email: z.email() });
export type User = z.infer<typeof UserSchema>;

/**
 * A membership: the person's role in one workspace and the capabilities the SERVER derived from it.
 * The client renders from `capabilities` and never works them out from `role`, which is for display.
 * `scope` names the permission partition: responses differ by it, so cache keys include it.
 */
export const MembershipSchema = z.object({
  tenant: TenantSchema,
  role: RoleSchema,
  capabilities: z.array(CapabilitySchema),
  scope: z.string().min(1),
});
export type Membership = z.infer<typeof MembershipSchema>;

/** What the app loads once at start, before any workspace data. */
export const SessionSchema = z.object({ user: UserSchema, memberships: z.array(MembershipSchema).min(1) });
export type Session = z.infer<typeof SessionSchema>;

/** The list's tabs. Each is a named predicate in src/app/model; the server counts the same ones. */
export const RECORD_VIEWS = ['all', 'open', 'drafts', 'archived'] as const;
export const RecordViewSchema = z.enum(RECORD_VIEWS);
export type RecordView = z.infer<typeof RecordViewSchema>;

/**
 * Server counts for a search: one per view (the tabs) and one per status (the board's columns).
 * Both are counted with the same named predicates the list filters by.
 */
export const RecordCountsSchema = z.object({
  counts: z.record(RecordViewSchema, z.number().int().nonnegative()),
  statuses: z.record(RecordStatusSchema, z.number().int().nonnegative()),
});
export type RecordCounts = z.infer<typeof RecordCountsSchema>['counts'];
export type StatusCounts = z.infer<typeof RecordCountsSchema>['statuses'];

/** The statuses a person can move a record between. Archiving is its own verb, with its own rules. */
export const MOVABLE_STATUSES = ['draft', 'pending', 'active', 'overdue'] as const satisfies readonly RecordStatus[];
export type MovableStatus = (typeof MOVABLE_STATUSES)[number];

export const SORT_KEYS = ['name', '-name', 'amount', '-amount', 'updated', '-updated'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** What a list query asks for: search, filters, sort and page. Also the list's cache-key params. */
export interface RecordQuery {
  q: string;
  status: readonly RecordStatus[];
  view: RecordView;
  /** Only this account's records, by id: a related-entity page is the same query, joined. */
  account?: string;
  /** Only this person's records, by id. */
  owner?: string;
  sort: SortKey;
  page: number;
  pageSize: number;
}

/** A filter without paging or sort: what "Select all N matching" selects, and what counts count. */
export type RecordFilter = Pick<RecordQuery, 'q' | 'status' | 'view' | 'account' | 'owner'>;

/** The list's surfaces over one query (see DISPLAYS in src/app/model/projections.ts). */
export const DISPLAY_MODES = ['table', 'board'] as const;
export type Display = (typeof DISPLAY_MODES)[number];

/** The list's optional columns (the name is always shown). A saved view says which are visible, in this order. */
export const RECORD_COLUMNS = ['owner', 'account', 'status', 'updated', 'amount'] as const;
export const RecordColumnSchema = z.enum(RECORD_COLUMNS);
export type RecordColumn = z.infer<typeof RecordColumnSchema>;

/**
 * A saved view is config, not code: the named combination of tab, search, filters, sort, columns
 * and display that the list's URL already expresses. Stored per person, per workspace.
 */
export const SavedViewConfigSchema = z.object({
  view: RecordViewSchema,
  q: z.string(),
  status: z.array(RecordStatusSchema),
  sort: z.enum(SORT_KEYS),
  columns: z.array(RecordColumnSchema),
  display: z.enum(DISPLAY_MODES),
});
export type SavedViewConfig = z.infer<typeof SavedViewConfigSchema>;

export const SavedViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  config: SavedViewConfigSchema,
  /** Opens when the list is opened with nothing in its URL. At most one per person per workspace. */
  isDefault: z.boolean(),
});
export type SavedView = z.infer<typeof SavedViewSchema>;
export const SavedViewsSchema = z.object({ items: z.array(SavedViewSchema) });

