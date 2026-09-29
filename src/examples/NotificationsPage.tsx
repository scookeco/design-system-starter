/**
 * GOLDEN EXAMPLE: the notification centre. Events that concern the signed-in person, newest first,
 * read or unread; the bell in the header (Notifications.tsx) is its summary on every page.
 * Different from the inbox: the inbox is work to triage one item at a time; this is a feed to
 * catch up on. No CSS file, no className, no style.
 *
 * Anatomy:
 *   shell    no nav item: the bell in the header is the way in
 *   header   PageHeader: "Notifications" · the unread count · Mark all read (a named mutation)
 *   views    NavTabs with server counts: All · Unread (push); a Type filter (replace); both in the URL
 *   live     new ones arrive on the live channel: the count moves at once, rows never move under
 *            the cursor, and a banner offers "Show 2 new"
 *   list     a table: what happened (the actor joined by id, what it was about, as it was called
 *            then) as a link that marks it read, when, and Mark read / Mark unread per row
 *
 * Marking read is optimistic (the person's own cheap action); Mark all read is pessimistic (the
 * server marks what this page hasn't loaded too). Loading, error and both empty states are here.
 */
import {
  Badge,
  Banner,
  Button,
  Center,
  Cluster,
  EmptyState,
  Link,
  NavTabs,
  PageHeader,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  useFormat,
  useToast,
} from '../index';
import { NOTIFICATION_KINDS, type Notification, type NotificationKind } from '../app/api/notifications';
import { useMarkAllNotificationsRead, useMarkNotificationsRead, useNewNotifications, useNotifications } from '../app/model/notifications';
import { notificationsCodec } from '../app/url/b2bState';
import { useUrlState } from '../app/url/useUrlState';
import { ExampleShell } from './ExampleShell';
import { useNotificationTitle } from './Notifications';

const KIND_LABEL: Record<NotificationKind, string> = { mention: 'Mentions', assignment: 'Assignments', comment: 'Comments', approval: 'Approvals', job: 'Jobs' };
const KIND_OPTIONS = [{ value: 'any', label: 'All types' }, ...NOTIFICATION_KINDS.map((kind) => ({ value: kind, label: KIND_LABEL[kind] }))];

export interface NotificationsPageProps {
  /** Open the bell's popover on first render (gallery and tests). */
  initialBellOpen?: boolean;
}

export function NotificationsPage({ initialBellOpen = false }: NotificationsPageProps) {
  return (
    <ExampleShell current="" notificationsOpen={initialBellOpen}>
      <Center max="lg" gutters="lg">
        <NotificationsContent />
      </Center>
    </ExampleShell>
  );
}

function NotificationsContent() {
  const format = useFormat();
  const toast = useToast();
  const [url, nav] = useUrlState(notificationsCodec);
  const list = useNotifications(url);
  const markRead = useMarkNotificationsRead();
  const markAll = useMarkAllNotificationsRead();
  const fresh = useNewNotifications();
  const counts = list.data?.counts;
  const items = list.data?.items ?? [];

  const markAllRead = () =>
    markAll.mutate(undefined, {
      onSuccess: () => toast({ title: 'All notifications marked read', tone: 'success' }),
      onError: () => toast({ title: 'Couldn’t mark them read', description: 'Nothing changed. Try again.', tone: 'danger', duration: Infinity }),
    });
  const setRead = (ids: readonly string[], read: boolean) =>
    markRead.mutate({ ids, read }, { onError: () => toast({ title: 'Couldn’t update that notification', description: 'It’s back as it was. Try again.', tone: 'danger', duration: Infinity }) });

  return (
    <Stack gap="lg">
      <PageHeader
        title="Notifications"
        description={counts ? `${format.number(counts.unread)} unread` : 'Loading…'}
        actions={
          counts && counts.unread > 0 ? (
            <Button variant="secondary" loading={markAll.isPending} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />
      <NavTabs
        label="Notification views"
        current={nav.href({ view: url.view, kind: '' })}
        items={[
          { label: counts ? `All (${format.number(counts.all)})` : 'All', href: nav.href({ view: 'all', kind: '' }) },
          { label: counts ? `Unread (${format.number(counts.unread)})` : 'Unread', href: nav.href({ view: 'unread', kind: '' }) },
        ]}
        onNavigate={(href) => nav.push(notificationsCodec.parse(href.slice(href.indexOf('?') + 1)))}
      />
      <Cluster gap="sm" align="end">
        <Select
          label="Type"
          size="sm"
          options={KIND_OPTIONS}
          value={url.kind || 'any'}
          onValueChange={(value) => nav.replace({ kind: value === 'any' ? '' : (value as NotificationKind) })}
        />
      </Cluster>
      {fresh.count > 0 ? (
        <Banner
          tone="info"
          title={`${format.number(fresh.count)} new ${fresh.count === 1 ? 'notification' : 'notifications'}`}
          action={
            <Button variant="secondary" size="sm" onClick={() => void fresh.show()}>
              {`Show ${format.number(fresh.count)} new`}
            </Button>
          }
        >
          They’ll appear at the top when you show them.
        </Banner>
      ) : null}
      {list.isPending ? (
        <Skeleton shape="table-row" lines={8} columns={3} />
      ) : list.isError ? (
        <Banner
          tone="danger"
          title="Notifications didn’t load"
          action={
            <Button variant="secondary" onClick={() => void list.refetch()}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Banner>
      ) : items.length === 0 ? (
        <EmptyState
          reason={url.view === 'unread' || url.kind ? 'no-results' : 'first-use'}
          title={url.view === 'unread' && !url.kind ? 'You’re all caught up' : url.kind ? `No ${KIND_LABEL[url.kind].toLowerCase()}` : 'No notifications yet'}
          description={url.kind ? 'Choose All types to see everything.' : 'Mentions, assignments, comments, approvals and finished jobs show up here.'}
          headingLevel={2}
        />
      ) : (
        <Table caption={url.view === 'unread' ? 'Unread notifications' : 'Notifications'} hideCaption>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Notification</TableHeaderCell>
              <TableHeaderCell numeric>When</TableHeaderCell>
              <TableHeaderCell>
                <Text as="span" size="caption">
                  Actions
                </Text>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((n) => (
              <NotificationRow key={n.id} notification={n} onRead={(read) => setRead([n.id], read)} />
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}

function NotificationRow({ notification, onRead }: { notification: Notification; onRead: (read: boolean) => void }) {
  const format = useFormat();
  const title = useNotificationTitle(notification);
  return (
    <TableRow>
      <TableCell rowHeader>
        <Stack gap="2xs">
          <Link href={notification.href} onClick={() => (notification.read ? undefined : onRead(true))}>
            {notification.read ? title : <strong>{title}</strong>}
          </Link>
          {notification.body ? (
            <Text as="span" size="caption" tone="muted">
              {notification.body}
            </Text>
          ) : null}
        </Stack>
      </TableCell>
      <TableCell numeric>
        <Stack gap="2xs" align="end">
          <Text as="span" size="caption">
            {format.relative(notification.createdAt)}
          </Text>
          {notification.read ? null : (
            <Badge tone="info" indicator="dot">
              Unread
            </Badge>
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={() => onRead(!notification.read)} aria-label={`${notification.read ? 'Mark unread' : 'Mark read'}: ${title}`}>
          {notification.read ? 'Mark unread' : 'Mark read'}
        </Button>
      </TableCell>
    </TableRow>
  );
}
