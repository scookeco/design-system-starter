/**
 * The inbox: what needs the signed-in person's attention in this workspace (mentions,
 * assignments, approvals, comments, renewals). Its contract (schemas) and endpoints, the tenant
 * first, every response parsed at the boundary. Kept beside its endpoints, like each domain
 * added after the records contract (src/app/api/schemas.ts).
 */
import { z } from 'zod';
import { request } from './client';
import type { Tenant } from './schemas';

export const INBOX_KINDS = ['mention', 'assignment', 'approval', 'comment', 'renewal'] as const;
export const InboxKindSchema = z.enum(INBOX_KINDS);
export type InboxKind = z.infer<typeof InboxKindSchema>;

export const InboxItemSchema = z.object({
  id: z.string().min(1),
  kind: InboxKindSchema,
  subject: z.string().min(1),
  /** The first line of the body, for the list. */
  preview: z.string(),
  body: z.string(),
  /** Who it's from, by id: a person in the directory. */
  fromId: z.string().min(1),
  /** The record it's about, by id, if any. */
  recordId: z.string().min(1).nullable(),
  receivedAt: z.iso.datetime({ offset: true }),
  read: z.boolean(),
  archived: z.boolean(),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

export const INBOX_VIEWS = ['inbox', 'archived'] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export const InboxListSchema = z.object({
  items: z.array(InboxItemSchema),
  /** Counted by the server over everything this person may see, not just this page. */
  counts: z.object({ inbox: z.number().int().nonnegative(), unread: z.number().int().nonnegative(), archived: z.number().int().nonnegative() }),
});
export type InboxList = z.infer<typeof InboxListSchema>;

export const TRIAGE_ACTIONS = ['read', 'unread', 'archive', 'unarchive'] as const;
export type TriageAction = (typeof TRIAGE_ACTIONS)[number];

export const TriageResultSchema = z.object({ items: z.array(InboxItemSchema) });

const base = (tenant: Tenant) => `/t/${tenant}/inbox`;

export const listInbox = (tenant: Tenant, view: InboxView, signal?: AbortSignal) => request(InboxListSchema, `${base(tenant)}?view=${view}`, { signal });

/** One request for one or many items: bulk triage is the same verb as a single one. */
export const postTriage = (tenant: Tenant, ids: readonly string[], action: TriageAction) =>
  request(TriageResultSchema, `${base(tenant)}/triage`, { method: 'POST', body: { ids, action } });
