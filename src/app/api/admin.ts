/**
 * The admin console's contract: members (who's in the workspace, their role, invitations) and the
 * audit log (who did what, to what, when). Schemas and endpoints, the tenant first, every response
 * parsed at the boundary.
 */
import { z } from 'zod';
import { request } from './client';
import { RoleSchema, type Role, type Tenant } from './schemas';

export const MEMBER_STATUSES = ['active', 'invited'] as const;

export const MemberSchema = z.object({
  id: z.string().min(1),
  /** The person, by id, once they've joined; null while invited (only the email is known). */
  personId: z.string().min(1).nullable(),
  email: z.email(),
  role: RoleSchema,
  status: z.enum(MEMBER_STATUSES),
  /** The signed-in person's own membership. */
  isYou: z.boolean(),
  invitedAt: z.iso.datetime({ offset: true }).nullable(),
  lastActiveAt: z.iso.datetime({ offset: true }).nullable(),
  version: z.number().int().nonnegative(),
});
export type Member = z.infer<typeof MemberSchema>;
export const MembersSchema = z.object({ items: z.array(MemberSchema) });

/**
 * Audit actions: resource.verb, one per named mutation, so the log, analytics and webhooks share
 * one vocabulary. Every admin write emits one (denied attempts too).
 */
export const AUDIT_ACTIONS = [
  'member.invited',
  'member.role_changed',
  'member.removed',
  'record.created',
  'record.renamed',
  'record.archived',
  'record.deleted',
  'account.updated',
  'session.signed_in',
  'api_key.created',
  'api_key.revoked',
] as const;
export const AuditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof AuditActionSchema>;

/**
 * An audit event is a snapshot, not a join: it records the actor's and target's names as they were
 * at the time. People leave and records are deleted; the log must still say who did what.
 */
export const AuditEventSchema = z.object({
  id: z.string().min(1),
  at: z.iso.datetime({ offset: true }),
  actor: z.object({ type: z.enum(['person', 'system', 'api-key']), id: z.string().min(1), label: z.string().min(1) }),
  action: AuditActionSchema,
  target: z.object({ type: z.enum(['member', 'record', 'account', 'workspace', 'api-key']), id: z.string().min(1), label: z.string().min(1) }),
  outcome: z.enum(['success', 'denied']),
  /** Where the request came from; null for system events. */
  ip: z.string().nullable(),
  /** What changed, where it helps: a role's before and after. Never a secret. */
  changes: z.array(z.object({ field: z.string(), before: z.string().nullable(), after: z.string().nullable() })),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AuditPageSchema = z.object({
  items: z.array(AuditEventSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type AuditPage = z.infer<typeof AuditPageSchema>;

/** Who and what can be filtered on: every actor in the log, and every action. */
export const AuditFacetsSchema = z.object({
  actors: z.array(z.object({ id: z.string(), label: z.string(), type: z.enum(['person', 'system', 'api-key']) })),
});
export type AuditFacets = z.infer<typeof AuditFacetsSchema>;

/** The filters, as the server takes them: instants for the time bounds, never calendar dates. */
export interface AuditQuery {
  actor: string;
  actions: readonly AuditAction[];
  /** Inclusive start and exclusive end, ISO instants. The client turns a date range into these in the reader's time zone. */
  from: string;
  to: string;
  page: number;
  pageSize: number;
}

export const AuditExportSchema = z.object({ filename: z.string().min(1), contentType: z.literal('text/csv'), content: z.string() });

const base = (tenant: Tenant) => `/t/${tenant}`;

const auditParams = (query: Omit<AuditQuery, 'page' | 'pageSize'>) => {
  const params = new URLSearchParams();
  if (query.actor) params.set('actor', query.actor);
  if (query.actions.length > 0) params.set('action', query.actions.join(','));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return params;
};

export const listMembers = (tenant: Tenant, signal?: AbortSignal) => request(MembersSchema, `${base(tenant)}/members`, { signal });

export const postInvite = (tenant: Tenant, invite: { email: string; role: Role }) => request(MemberSchema, `${base(tenant)}/members`, { method: 'POST', body: invite });

/** Sends the version it was based on; a stale change gets a 409. */
export const patchMemberRole = (tenant: Tenant, id: string, role: Role, version: number) =>
  request(MemberSchema, `${base(tenant)}/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: { role, version } });

export const deleteMember = (tenant: Tenant, id: string) => request(z.object({ removed: z.string() }), `${base(tenant)}/members/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listAudit = (tenant: Tenant, query: AuditQuery, signal?: AbortSignal) => {
  const params = auditParams(query);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  return request(AuditPageSchema, `${base(tenant)}/audit?${params.toString()}`, { signal });
};

export const getAuditFacets = (tenant: Tenant, signal?: AbortSignal) => request(AuditFacetsSchema, `${base(tenant)}/audit/facets`, { signal });

/** Every event matching the filters (not just the page on screen), as CSV. */
export const getAuditExport = (tenant: Tenant, query: Omit<AuditQuery, 'page' | 'pageSize'>) =>
  request(AuditExportSchema, `${base(tenant)}/audit/export?${auditParams(query).toString()}`);
