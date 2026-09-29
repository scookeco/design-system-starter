/**
 * The mock notifications: seeded from their own PRNG stream (seed + 7), per tenant, hanging off the
 * tenant's database partition (reset with it), filtered by what the person may see like the inbox.
 * New ones come from "another user" (src/app/mocks/live.ts: `{ kind: 'notify' }`), written here and
 * published on the live channel.
 */
import { http, HttpResponse } from 'msw';
import { NOTIFICATION_KINDS, NotificationKindSchema, type Notification, type NotificationKind } from '../api/notifications';
import type { RecordEntity, Tenant } from '../api/schemas';
import { canSee, type Grant } from '../model/permissions';
import { db, grantFor } from './db';
import { error, handle } from './route';
import { SEED_EPOCH, seededRandom, seedPeople, seedRecords, TENANT_SPECS } from './seed';

const API = '*/api/t/:tenant';
const MINUTE = 60 * 1000;

const BODIES: Record<NotificationKind, readonly string[]> = {
  mention: ['Can you check the amount before Friday?', 'Looping you in: the customer asked about renewal terms.'],
  assignment: ['You’re the owner now.', 'Handing this over while I’m away.'],
  comment: ['Updated the terms to match the new pricing.', 'Legal is happy with the latest draft.'],
  approval: ['Approved. It can go to the customer.', 'Approved with one change to the payment terms.'],
  job: ['41 records imported, 2 rows failed.', 'All 12 records deleted.'],
};

interface NotificationState {
  items: Notification[];
  next: number;
}

const states = new WeakMap<object, NotificationState>();

const seed = (tenant: Tenant): Notification[] => {
  const random = seededRandom(TENANT_SPECS[tenant].seed + 7);
  const people = seedPeople(tenant).slice(1);
  const records = seedRecords(tenant).filter((r) => r.status !== 'archived');
  let at = SEED_EPOCH - 12 * MINUTE;
  return Array.from({ length: 24 }, (_, index) => {
    const kind = NOTIFICATION_KINDS[Math.floor(random() * NOTIFICATION_KINDS.length)] as NotificationKind;
    const record = records[Math.floor(random() * records.length)] as RecordEntity;
    const actor = people[Math.floor(random() * people.length)];
    const bodies = BODIES[kind];
    at -= Math.floor(random() * 9 * 60 * MINUTE) + 20 * MINUTE;
    return {
      id: `${tenant}-n${String(index + 1).padStart(3, '0')}`,
      kind,
      actorId: kind === 'job' ? null : (actor?.id ?? null),
      subject: kind === 'job' ? (index % 2 === 0 ? 'Import from renewals.csv' : 'Delete 12 drafts') : record.name,
      body: bodies[Math.floor(random() * bodies.length)] ?? '',
      recordId: kind === 'job' ? null : record.id,
      href: kind === 'job' ? '/records' : `/records/${record.id}`,
      createdAt: new Date(at).toISOString(),
      // The newest few are unread.
      read: index >= 4 && random() < 0.85,
    };
  });
};

const state = (tenant: Tenant): NotificationState => {
  const partition = db(tenant);
  let found = states.get(partition);
  if (!found) {
    found = { items: seed(tenant), next: 25 };
    states.set(partition, found);
  }
  return found;
};

/** What this grant may see: nothing about a record it can't open (a draft, for a viewer). */
const visibleTo = (tenant: Tenant, grant: Grant) => {
  const records = new Map(db(tenant).records.map((r) => [r.id, r]));
  return (n: Notification) => {
    const record = n.recordId ? records.get(n.recordId) : undefined;
    return !record || canSee(grant, record);
  };
};

/**
 * A new notification for the signed-in person, from a colleague (by id): written, then returned for
 * the live channel to publish. Undefined when the person couldn't see what it's about.
 */
export const pushNotification = (tenant: Tenant, change: { by: string; kind?: NotificationKind; recordId?: string; body?: string }): Notification | undefined => {
  const s = state(tenant);
  const partition = db(tenant);
  const record = partition.records.find((r) => r.id === change.recordId) ?? partition.records.find((r) => r.status === 'pending');
  if (!record) return undefined;
  const kind = change.kind ?? 'mention';
  const notification: Notification = {
    id: `${tenant}-n${String(s.next).padStart(3, '0')}`,
    kind,
    actorId: change.by,
    subject: record.name,
    body: change.body ?? BODIES[kind][0] ?? '',
    recordId: record.id,
    href: `/records/${record.id}`,
    createdAt: new Date(SEED_EPOCH + s.next * 1000).toISOString(),
    read: false,
  };
  s.next += 1;
  s.items.unshift(notification);
  return visibleTo(tenant, grantFor(tenant))(notification) ? notification : undefined;
};

export const notificationHandlers = [
  http.get(
    `${API}/notifications`,
    handle('workspace:read', ({ tenant, grant, request }) => {
      const url = new URL(request.url);
      const unread = url.searchParams.get('view') === 'unread';
      const kind = NotificationKindSchema.safeParse(url.searchParams.get('kind'));
      const visible = state(tenant).items.filter(visibleTo(tenant, grant));
      const items = visible.filter((n) => (!unread || !n.read) && (!kind.success || n.kind === kind.data));
      return HttpResponse.json({ items, counts: { all: visible.length, unread: visible.filter((n) => !n.read).length } });
    }),
  ),

  http.post(
    `${API}/notifications/read`,
    handle('workspace:read', async ({ tenant, grant, request }) => {
      const body = (await request.json()) as Partial<{ ids: string[]; read: boolean }>;
      if (!Array.isArray(body.ids) || body.ids.length === 0 || typeof body.read !== 'boolean') return error(422, 'invalid', 'Choose notifications to mark.');
      const visible = visibleTo(tenant, grant);
      const s = state(tenant);
      const updated: Notification[] = [];
      s.items = s.items.map((n) => {
        if (!body.ids?.includes(n.id) || !visible(n)) return n;
        const next = { ...n, read: body.read === true };
        updated.push(next);
        return next;
      });
      return HttpResponse.json({ items: updated });
    }),
  ),

  http.post(
    `${API}/notifications/read-all`,
    handle('workspace:read', ({ tenant, grant }) => {
      const visible = visibleTo(tenant, grant);
      const s = state(tenant);
      let marked = 0;
      s.items = s.items.map((n) => {
        if (n.read || !visible(n)) return n;
        marked += 1;
        return { ...n, read: true };
      });
      return HttpResponse.json({ marked });
    }),
  ),
];
