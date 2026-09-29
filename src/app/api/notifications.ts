/**
 * Notifications: events that concern the signed-in person (a mention, an assignment, a comment, an
 * approval, a job that finished). Their contract and endpoints, the tenant first, every response
 * parsed at the boundary. New ones also arrive on the live channel (src/app/api/live.ts).
 *
 * The actor is an id, joined through the people directory at render. What it's about is a
 * snapshot, like an audit event: `subject` says what the record was called when it happened, and
 * `recordId` links to it as it is now.
 */
import { z } from 'zod';
import { request } from './client';
import type { Tenant } from './schemas';

export const NOTIFICATION_KINDS = ['mention', 'assignment', 'comment', 'approval', 'job'] as const;
export const NotificationKindSchema = z.enum(NOTIFICATION_KINDS);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

export const NotificationSchema = z.object({
  id: z.string().min(1),
  kind: NotificationKindSchema,
  /** Who did it, by id; null for the system (a job). */
  actorId: z.string().min(1).nullable(),
  /** What it was about, as it was called then. */
  subject: z.string().min(1),
  /** One line of detail: the comment's first line, a job's outcome. */
  body: z.string(),
  /** The record it's about, by id, if any. */
  recordId: z.string().min(1).nullable(),
  /** Where opening it goes. */
  href: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
  read: z.boolean(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NOTIFICATION_VIEWS = ['all', 'unread'] as const;
export type NotificationView = (typeof NOTIFICATION_VIEWS)[number];

export const NotificationListSchema = z.object({
  items: z.array(NotificationSchema),
  /** Counted by the server over everything this person may see, not just this list. */
  counts: z.object({ all: z.number().int().nonnegative(), unread: z.number().int().nonnegative() }),
});
export type NotificationList = z.infer<typeof NotificationListSchema>;

export interface NotificationQuery {
  view: NotificationView;
  /** One kind, or '' for every kind. */
  kind: NotificationKind | '';
}

const base = (tenant: Tenant) => `/t/${tenant}/notifications`;

export const listNotifications = (tenant: Tenant, query: NotificationQuery, signal?: AbortSignal) =>
  request(NotificationListSchema, `${base(tenant)}?view=${query.view}${query.kind ? `&kind=${query.kind}` : ''}`, { signal });

/** Mark some read or unread: one request for one or many. */
export const postNotificationsRead = (tenant: Tenant, ids: readonly string[], read: boolean) =>
  request(z.object({ items: z.array(NotificationSchema) }), `${base(tenant)}/read`, { method: 'POST', body: { ids, read } });

/** Mark everything read, on the server: including what this client hasn't loaded. */
export const postAllNotificationsRead = (tenant: Tenant) => request(z.object({ marked: z.number().int().nonnegative() }), `${base(tenant)}/read-all`, { method: 'POST' });
