/**
 * Notifications, composed from system components (src/app/model/notifications.ts):
 *
 *   NotificationsIndicator   in the shell's header on every page: a bell with the unread count,
 *                            opening a popover with the latest unread, Mark all read and a link to
 *                            the notification centre
 *   NotificationTitle        one sentence per kind, the actor joined by id ("Priya Natarajan
 *                            mentioned you on Hardware lease")
 *
 * The count follows the live channel at once; the list in the popover reads fresh when it opens.
 */
import { BellIcon, Button, Cluster, Link, Popover, Stack, Text, useFormat } from '../index';
import type { Notification, NotificationKind } from '../app/api/notifications';
import { BELL_QUERY, useMarkAllNotificationsRead, useMarkNotificationsRead, useNotifications } from '../app/model/notifications';
import { usePersonName } from '../app/registries/refs';

const SENTENCE: Record<NotificationKind, (actor: string, subject: string) => string> = {
  mention: (actor, subject) => `${actor} mentioned you on ${subject}`,
  assignment: (actor, subject) => `${actor} assigned ${subject} to you`,
  comment: (actor, subject) => `${actor} commented on ${subject}`,
  approval: (actor, subject) => `${actor} approved ${subject}`,
  job: (_actor, subject) => `Finished: ${subject}`,
};

/** What happened, in one sentence, with the actor's current name. */
export function useNotificationTitle(notification: Notification) {
  const actor = usePersonName(notification.actorId ?? '') ?? (notification.actorId ? 'Someone' : 'System');
  return SENTENCE[notification.kind](actor, notification.subject);
}

/** Shown in the popover: the latest few unread; the centre has the rest. */
const LATEST = 5;

function LatestItem({ notification, onOpen }: { notification: Notification; onOpen: () => void }) {
  const format = useFormat();
  const title = useNotificationTitle(notification);
  return (
    <Stack as="li" gap="2xs">
      <Link href={notification.href} onClick={onOpen}>
        {title}
      </Link>
      <Text size="caption" tone="muted" numeric>
        {format.relative(notification.createdAt)}
      </Text>
    </Stack>
  );
}

export interface NotificationsIndicatorProps {
  /** Open the popover on first render (gallery and tests). */
  defaultOpen?: boolean;
}

/** The bell in the header: the unread count as text (never a dot alone), and the latest in a popover. */
export function NotificationsIndicator({ defaultOpen = false }: NotificationsIndicatorProps) {
  const format = useFormat();
  const unread = useNotifications(BELL_QUERY);
  const markRead = useMarkNotificationsRead();
  const markAll = useMarkAllNotificationsRead();
  const count = unread.data?.counts.unread ?? 0;
  const latest = (unread.data?.items ?? []).filter((n) => !n.read).slice(0, LATEST);
  return (
    <Popover
      label="Notifications"
      align="end"
      defaultOpen={defaultOpen}
      trigger={
        <Button variant="ghost" icon={BellIcon} aria-label={count > 0 ? `Notifications: ${format.number(count)} unread` : 'Notifications'}>
          {count > 0 ? `${format.number(count)} unread` : 'Notifications'}
        </Button>
      }
    >
      <Stack gap="md">
        <Cluster justify="between" align="center" gap="sm">
          <Text size="caption" tone="muted">
            {unread.isError ? 'Notifications didn’t load.' : count > 0 ? `${format.number(count)} unread` : 'You’re all caught up.'}
          </Text>
          {count > 0 ? (
            <Button variant="ghost" size="sm" loading={markAll.isPending} onClick={() => markAll.mutate()}>
              Mark all read
            </Button>
          ) : null}
        </Cluster>
        {latest.length > 0 ? (
          <Stack as="ul" role="list" gap="md">
            {latest.map((n) => (
              <LatestItem key={n.id} notification={n} onOpen={() => markRead.mutate({ ids: [n.id], read: true })} />
            ))}
          </Stack>
        ) : null}
        <Link href="/notifications">See all notifications</Link>
      </Stack>
    </Popover>
  );
}
