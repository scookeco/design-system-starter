/**
 * GOLDEN EXAMPLE: an inbox with triage. The archetype for working through a queue one item at a
 * time: a SplitView (the list and the open item side by side, one pane on a narrow screen), the
 * open item and the tab in the URL, and keyboard triage from the shortcut registry:
 *
 *   j / k   next / previous (focus follows)        e   archive (the open item, or the selection)
 *   u       mark read / unread                     x   select the open item for bulk triage
 *   o       open (focus moves to the item)         g i go to the inbox (the app's shell registers it)
 *
 * Every shortcut mirrors a visible control (the toolbar, the row's context menu, the bulk bar) and
 * shows in its tooltip or menu, and in the ? overlay. Triage is optimistic (src/app/model/inbox.ts):
 * the item moves at once and comes back if the server says no.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Banner,
  Button,
  Center,
  Checkbox,
  Cluster,
  ContextMenu,
  EmptyState,
  Heading,
  Kbd,
  Link,
  NavTabs,
  PageHeader,
  Skeleton,
  SplitView,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  useFormat,
  useShortcut,
  useToast,
  type CheckedState,
  type MenuEntry,
} from '../index';
import type { InboxItem, InboxView } from '../app/api/inbox';
import { useArchiveInbox, useInbox, useMarkRead, useMarkUnread, useUnarchiveInbox } from '../app/model/inbox';
import { useRecord } from '../app/model/queries';
import { PersonRef, usePersonName } from '../app/registries/refs';
import { inboxCodec } from '../app/url/b2bState';
import { useUrlState } from '../app/url/useUrlState';
import { ExampleShell } from './ExampleShell';

const KIND_LABEL: Record<InboxItem['kind'], string> = { mention: 'Mention', assignment: 'Assignment', approval: 'Approval', comment: 'Comment', renewal: 'Renewal' };

const rowLinkId = (id: string) => `inbox-row-${id}`;
const DETAIL_HEADING = 'inbox-detail-heading';

export interface InboxPageProps {
  /** Select these ids on load (gallery and tests). */
  initialSelection?: readonly string[];
  /** Open the ? overlay on load (gallery and tests). */
  initialShortcutsOpen?: boolean;
}

export function InboxPage({ initialSelection = [], initialShortcutsOpen = false }: InboxPageProps) {
  return (
    <ExampleShell current="/inbox" initialShortcutsOpen={initialShortcutsOpen}>
      <Center max="lg" gutters="lg">
        <InboxContent initialSelection={initialSelection} />
      </Center>
    </ExampleShell>
  );
}

/** Inside the shell, so toasts reach the shell's region. */
function InboxContent({ initialSelection }: { initialSelection: readonly string[] }) {
  const format = useFormat();
  const toast = useToast();
  const [url, nav] = useUrlState(inboxCodec);
  const inbox = useInbox(url.view);
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();
  const archive = useArchiveInbox();
  const unarchive = useUnarchiveInbox();
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set(initialSelection));

  const items = inbox.data?.items ?? [];
  const counts = inbox.data?.counts;
  const index = items.findIndex((item) => item.id === url.item);
  const current = index === -1 ? undefined : items[index];
  const selected = items.filter((item) => selection.has(item.id));
  // Bulk actions act on the selection; with nothing selected, on the open item.
  const targets = selected.length > 0 ? selected : current ? [current] : [];

  // Opening an unread item marks it read, once.
  const markedRead = useRef(new Set<string>());
  useEffect(() => {
    if (!current || current.read || markedRead.current.has(current.id)) return;
    markedRead.current.add(current.id);
    markRead.mutate([current.id]);
  }, [current, markRead]);

  const focusRow = (id: string) => requestAnimationFrame(() => document.getElementById(rowLinkId(id))?.focus());

  /** Move the open item (j/k): replace, so Back leaves the inbox rather than stepping through it. */
  const move = (by: number) => {
    if (items.length === 0) return;
    const next = items[Math.min(items.length - 1, Math.max(0, (index === -1 ? (by > 0 ? -1 : items.length) : index) + by))];
    if (!next) return;
    nav.replace({ item: next.id });
    focusRow(next.id);
  };

  const openDetail = () => {
    if (!current) return;
    requestAnimationFrame(() => document.getElementById(DETAIL_HEADING)?.focus());
  };

  const switchView = (view: InboxView) => {
    setSelection(new Set());
    nav.push({ view, item: '' });
  };

  const toggleSelected = (id: string, on: boolean) =>
    setSelection((before) => {
      const next = new Set(before);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Archive (or move back to Inbox), then open the next item, as a triage flow expects. */
  const archiveTargets = () => {
    if (targets.length === 0) return;
    const ids = targets.map((t) => t.id);
    const after = items.filter((item) => !ids.includes(item.id));
    const nextOpen = current && ids.includes(current.id) ? (items.slice(index + 1).find((i) => !ids.includes(i.id)) ?? after.at(-1)) : current;
    const verb = url.view === 'inbox' ? archive : unarchive;
    verb.mutate(ids, {
      onError: () =>
        toast({ title: url.view === 'inbox' ? 'Couldn’t archive' : 'Couldn’t move to Inbox', description: 'Nothing changed. Try again.', tone: 'danger', duration: Infinity }),
    });
    setSelection(new Set());
    nav.replace({ item: nextOpen?.id ?? '' });
    if (nextOpen) focusRow(nextOpen.id);
    toast({ title: url.view === 'inbox' ? `${format.number(ids.length)} archived` : `${format.number(ids.length)} moved to Inbox`, tone: 'success' });
  };

  /** Read if any target is unread, otherwise unread: one key, the obvious direction. */
  const toggleRead = () => {
    if (targets.length === 0) return;
    const ids = targets.map((t) => t.id);
    if (targets.some((t) => !t.read)) markRead.mutate(ids);
    else {
      markedRead.current = new Set([...markedRead.current, ...ids]);
      markUnread.mutate(ids);
    }
  };

  const hasItems = items.length > 0;
  useShortcut({ id: 'inbox.next', keys: 'j', description: 'Next conversation', scope: 'Inbox', handler: () => move(1), enabled: hasItems });
  useShortcut({ id: 'inbox.previous', keys: 'k', description: 'Previous conversation', scope: 'Inbox', handler: () => move(-1), enabled: hasItems });
  useShortcut({ id: 'inbox.open', keys: 'o', description: 'Open the conversation', scope: 'Inbox', handler: openDetail, enabled: Boolean(current) });
  useShortcut({
    id: 'inbox.archive',
    keys: 'e',
    description: url.view === 'inbox' ? 'Archive' : 'Move to Inbox',
    scope: 'Inbox',
    handler: archiveTargets,
    enabled: targets.length > 0,
  });
  useShortcut({ id: 'inbox.read', keys: 'u', description: 'Mark read or unread', scope: 'Inbox', handler: toggleRead, enabled: targets.length > 0 });
  useShortcut({
    id: 'inbox.select',
    keys: 'x',
    description: 'Select the open conversation',
    scope: 'Inbox',
    handler: () => current && toggleSelected(current.id, !selection.has(current.id)),
    enabled: Boolean(current),
  });

  const archiveLabel = url.view === 'inbox' ? 'Archive' : 'Move to Inbox';
  const allChecked: CheckedState = hasItems && selected.length === items.length ? true : selected.length > 0 ? 'indeterminate' : false;

  const list = (
    <Stack gap="sm">
      {selected.length > 0 ? (
        <Cluster gap="sm" align="center">
          <Text as="span" size="caption" tone="muted">
            <span role="status">{`${format.number(selected.length)} selected`}</span>
          </Text>
          <Toolbar label="Selected conversations">
            <ToolbarButton shortcut="e" onClick={archiveTargets}>
              {archiveLabel}
            </ToolbarButton>
            <ToolbarButton shortcut="u" onClick={toggleRead}>
              {selected.some((t) => !t.read) ? 'Mark read' : 'Mark unread'}
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton onClick={() => setSelection(new Set())}>Clear selection</ToolbarButton>
          </Toolbar>
        </Cluster>
      ) : null}
      {inbox.isPending ? (
        <Skeleton shape="table-row" lines={8} columns={3} />
      ) : inbox.isError ? (
        <Banner
          tone="danger"
          title="The inbox didn’t load"
          action={
            <Button variant="secondary" onClick={() => void inbox.refetch()}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Banner>
      ) : !hasItems ? (
        <EmptyState
          reason={url.view === 'inbox' ? 'first-use' : 'no-results'}
          title={url.view === 'inbox' ? 'You’re all caught up' : 'Nothing archived'}
          description={url.view === 'inbox' ? 'New mentions, assignments and approvals show up here.' : 'Archived conversations wait here. Archive with E.'}
          headingLevel={2}
        />
      ) : (
        <Table caption={url.view === 'inbox' ? 'Inbox' : 'Archived'} hideCaption>
          <TableHead>
            <TableRow>
              <TableHeaderCell>
                <Checkbox
                  label="Select all conversations"
                  hideLabel
                  checked={allChecked}
                  onCheckedChange={(checked) => setSelection(checked === true ? new Set(items.map((i) => i.id)) : new Set())}
                />
              </TableHeaderCell>
              <TableHeaderCell>Conversation</TableHeaderCell>
              <TableHeaderCell numeric>Received</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                open={item.id === current?.id}
                selected={selection.has(item.id)}
                href={nav.href({ item: item.id })}
                archiveLabel={archiveLabel}
                onSelectedChange={(on) => toggleSelected(item.id, on)}
                onArchive={() => {
                  nav.replace({ item: item.id });
                  (url.view === 'inbox' ? archive : unarchive).mutate([item.id]);
                }}
                onToggleRead={() => (item.read ? markUnread : markRead).mutate([item.id])}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );

  const detail = current ? (
    <Detail item={current} archiveLabel={archiveLabel} onArchive={archiveTargets} onToggleRead={toggleRead} />
  ) : (
    <EmptyState
      reason="no-results"
      title="No conversation open"
      description={hasItems ? 'Choose one from the list, or press J to open the first.' : 'Nothing to open here.'}
      headingLevel={2}
    />
  );

  return (
    <Stack gap="lg">
      <PageHeader title="Inbox" description={counts ? `${format.number(counts.unread)} unread · J and K move, E archives, ? lists every shortcut` : 'Loading…'} />
      <NavTabs
        label="Inbox views"
        current={url.view === 'inbox' ? '/inbox' : '/inbox?view=archived'}
        items={[
          { label: counts ? `Inbox (${format.number(counts.inbox)})` : 'Inbox', href: '/inbox' },
          { label: counts ? `Archived (${format.number(counts.archived)})` : 'Archived', href: '/inbox?view=archived' },
        ]}
        onNavigate={(href) => switchView(href.includes('archived') ? 'archived' : 'inbox')}
      />
      <SplitView
        listLabel="Conversations"
        detailLabel="Conversation"
        list={list}
        detail={detail}
        show={current ? 'detail' : 'list'}
        onBack={() => {
          const id = current?.id;
          nav.replace({ item: '' });
          if (id) focusRow(id);
        }}
        backLabel="All conversations"
      />
    </Stack>
  );
}

interface InboxRowProps {
  item: InboxItem;
  open: boolean;
  selected: boolean;
  href: string;
  archiveLabel: string;
  onSelectedChange: (on: boolean) => void;
  onArchive: () => void;
  onToggleRead: () => void;
}

/** One conversation. Right-click (or Shift+F10 on its link) offers the toolbar's actions too. */
function InboxRow({ item, open, selected, href, archiveLabel, onSelectedChange, onArchive, onToggleRead }: InboxRowProps) {
  const format = useFormat();
  const from = usePersonName(item.fromId) ?? '…';
  const actions: MenuEntry[] = [
    { label: item.read ? 'Mark unread' : 'Mark read', shortcut: 'u', onSelect: onToggleRead },
    { label: archiveLabel, shortcut: 'e', onSelect: onArchive },
  ];
  return (
    <ContextMenu items={actions} label={item.subject}>
      <TableRow selected={open} aria-current={open ? 'true' : undefined}>
        <TableCell>
          <Checkbox label={`Select “${item.subject}”`} hideLabel checked={selected} onCheckedChange={(checked) => onSelectedChange(checked === true)} />
        </TableCell>
        <TableCell rowHeader>
          <Stack gap="2xs">
            <Link href={href} id={rowLinkId(item.id)} aria-current={open ? 'true' : undefined}>
              {item.read ? item.subject : <strong>{item.subject}</strong>}
            </Link>
            <Text as="span" size="caption" tone="muted">
              {`${from} · ${KIND_LABEL[item.kind]} · ${item.preview}`}
            </Text>
          </Stack>
        </TableCell>
        <TableCell numeric>
          <Stack gap="2xs" align="end">
            <Text as="span" size="caption">
              {format.relative(item.receivedAt)}
            </Text>
            {item.read ? null : (
              <Badge tone="info" indicator="dot">
                Unread
              </Badge>
            )}
          </Stack>
        </TableCell>
      </TableRow>
    </ContextMenu>
  );
}

/** The open conversation: who, when, what it's about (joined by id), and the same actions as the list. */
function Detail({ item, archiveLabel, onArchive, onToggleRead }: { item: InboxItem; archiveLabel: string; onArchive: () => void; onToggleRead: () => void }) {
  const format = useFormat();
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <div id={DETAIL_HEADING} tabIndex={-1}>
          <Heading level={2} size={3}>
            {item.subject}
          </Heading>
        </div>
        <Cluster gap="sm" align="center">
          <PersonRef id={item.fromId} />
          <Text as="span" size="caption" tone="muted">
            {format.dateTime(item.receivedAt, { withZone: true })}
          </Text>
          <Badge tone="neutral" indicator="none">
            {KIND_LABEL[item.kind]}
          </Badge>
        </Cluster>
      </Stack>
      <Toolbar label="Conversation actions">
        <ToolbarButton shortcut="e" onClick={onArchive}>
          {archiveLabel}
        </ToolbarButton>
        <ToolbarButton shortcut="u" onClick={onToggleRead}>
          {item.read ? 'Mark unread' : 'Mark read'}
        </ToolbarButton>
      </Toolbar>
      <Text>{item.body}</Text>
      {item.recordId ? <About recordId={item.recordId} /> : null}
      <Text size="caption" tone="muted">
        <Kbd keys="j" /> <Kbd keys="k" /> next and previous · <Kbd keys="e" /> {archiveLabel.toLowerCase()} · <Kbd keys="?" /> all shortcuts
      </Text>
    </Stack>
  );
}

/** The record a conversation is about, joined by id: its current name, linked. */
function About({ recordId }: { recordId: string }) {
  const record = useRecord(recordId);
  return (
    <Text size="caption" tone="muted">
      About {record.data ? <Link href={`/records/${record.data.id}`}>{record.data.name}</Link> : record.isPending ? '…' : 'a record you can’t open'}
    </Text>
  );
}
