/**
 * GOLDEN EXAMPLE: an admin console. Two list pages behind NavTabs, built from the list archetype:
 *
 *   Members     who's in the workspace and their role. Invite, change a role (with a review of
 *               what it grants and takes away), remove. Everyone can see the list; the actions
 *               need members:manage: disabled with the reason on the page, hidden in menus.
 *               Your own role and the last admin are protected by named predicates the page,
 *               the mutation and the server share (src/app/model/members.ts).
 *   Audit log   who did what, to what, when: filter by actor (Combobox), event (MultiSelect) and
 *               dates (DateRangePicker, turned into instants in the reader's time zone), expand a
 *               row for the payload, export the current filter as CSV. Needs audit:read: the tab
 *               is hidden without it and the route shows the 403 page.
 *
 * Every member write emits an audit event from the write path (the mock server), so the log is
 * a projection of the mutations, denied attempts included.
 */
import { useState } from 'react';
import {
  Badge,
  Banner,
  Button,
  Center,
  CodeBlock,
  Cluster,
  Combobox,
  DateRangePicker,
  Dialog,
  EmptyState,
  Menu,
  MultiSelect,
  NavTabs,
  PageHeader,
  Pagination,
  RadioGroup,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextField,
  useFormat,
  useToast,
  type BadgeTone,
} from '../index';
import { AUDIT_ACTIONS, type AuditAction, type AuditEvent, type Member } from '../app/api/admin';
import { ApiError } from '../app/api/client';
import { ROLES, type Capability, type Role } from '../app/api/schemas';
import { dayRangeToInstants, useAuditFacets, useAuditLog, useChangeRole, useExportAudit, useInviteMember, useMembers, useRemoveMember } from '../app/model/admin';
import { isEmail, removalBlocked, roleChangeBlocked, ROLE_LABELS } from '../app/model/members';
import { ROLE_CAPABILITIES } from '../app/model/permissions';
import { PersonRef } from '../app/registries/refs';
import { useCan, usePermission, useSession } from '../app/session';
import { auditCodec, membersCodec, type AuditUrlState } from '../app/url/b2bState';
import { useUrlState } from '../app/url/useUrlState';
import { useTenant } from '../app/tenant';
import { WORKSPACES } from '../app/workspaces';
import { ExampleShell } from './ExampleShell';
import { gated, PermissionNote } from './Permission';

export type AdminSection = 'members' | 'audit';

export const AUDIT_LABELS: Record<AuditAction, string> = {
  'member.invited': 'Member invited',
  'member.role_changed': 'Role changed',
  'member.removed': 'Member removed',
  'record.created': 'Record created',
  'record.renamed': 'Record renamed',
  'record.archived': 'Record archived',
  'record.deleted': 'Record deleted',
  'account.updated': 'Account updated',
  'session.signed_in': 'Signed in',
  'api_key.created': 'API key created',
  'api_key.revoked': 'API key revoked',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  viewer: 'Sees records (not drafts) and accounts.',
  editor: 'Creates, edits, moves and archives records; adds accounts and people.',
  admin: 'Everything, including deleting records, managing members and the audit log.',
};

const STATUS_TONE: Record<Member['status'], BadgeTone> = { active: 'success', invited: 'info' };
const PAGE_SIZE = 20;

type MemberDialog = { kind: 'invite' } | { kind: 'role'; memberId: string; role?: Role } | { kind: 'remove'; memberId: string };

export interface AdminConsoleProps {
  section: AdminSection;
  /** Open a dialog on load (gallery and tests). */
  initialDialog?: MemberDialog;
  /** Expand these audit rows on load (gallery and tests). */
  initialExpanded?: readonly string[];
}

export function AdminConsole({ section, initialDialog, initialExpanded = [] }: AdminConsoleProps) {
  const can = useCan();
  const tenant = useTenant();
  const tabs = [{ label: 'Members', href: '/admin/members' }, ...(can('audit:read') ? [{ label: 'Audit log', href: '/admin/audit' }] : [])];
  return (
    <ExampleShell current="/admin/members">
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          {section === 'members' ? (
            <MembersSection initialDialog={initialDialog} />
          ) : (
            <PageHeader title="Audit log" description={`Who did what in ${WORKSPACES[tenant].name}, and when. Times in your time zone.`} />
          )}
          <NavTabs label="Admin sections" current={section === 'members' ? '/admin/members' : '/admin/audit'} items={tabs} />
          {section === 'members' ? <MembersTable initialDialog={initialDialog} /> : <AuditSection initialExpanded={initialExpanded} />}
        </Stack>
      </Center>
    </ExampleShell>
  );
}

// ---- members ---------------------------------------------------------------------------------

/** The page header: the count, and Invite (disabled with the reason for anyone who can't). */
function MembersSection({ initialDialog }: { initialDialog: MemberDialog | undefined }) {
  const format = useFormat();
  const tenant = useTenant();
  const members = useMembers();
  const invite = usePermission('members:manage');
  const [url, nav] = useUrlState(membersCodec);
  const [ownOpen, setOwnOpen] = useState(initialDialog?.kind === 'invite');
  const open = ownOpen || url.invite;
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    if (!next && url.invite) nav.replace({ invite: false });
  };
  const active = members.data?.filter((m) => m.status === 'active').length;
  return (
    <>
      <PageHeader
        title="Members"
        description={active === undefined ? `Who’s in ${WORKSPACES[tenant].name}.` : `${format.number(active)} members in ${WORKSPACES[tenant].name}, and open invitations.`}
        actions={
          <Stack gap="2xs" align="end">
            <Button icon="plus" onClick={() => setOpen(true)} {...gated(invite)}>
              Invite member
            </Button>
            <PermissionNote permission={invite} />
          </Stack>
        }
      />
      {invite.allowed ? <InviteDialog open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}

function MembersTable({ initialDialog }: { initialDialog: MemberDialog | undefined }) {
  const format = useFormat();
  const session = useSession();
  const can = useCan();
  const members = useMembers();
  const [dialog, setDialog] = useState<MemberDialog | undefined>(initialDialog?.kind === 'invite' ? undefined : initialDialog);
  const all = members.data ?? [];
  const target = dialog && dialog.kind !== 'invite' ? all.find((m) => m.id === dialog.memberId) : undefined;

  if (members.isPending) return <Skeleton shape="table-row" lines={6} columns={5} />;
  if (members.isError) {
    return (
      <Banner
        tone="danger"
        title="Members didn’t load"
        action={
          <Button variant="secondary" onClick={() => void members.refetch()}>
            Try again
          </Button>
        }
      >
        Check your connection and try again.
      </Banner>
    );
  }

  const name = (member: Member) => (member.isYou ? `${session.user.name} (you)` : member.personId ? <PersonRef id={member.personId} /> : member.email);

  return (
    <>
      <Table caption="Members">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Last active</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {all.map((member) => {
            // Overflow items a person can't use are hidden, not disabled: a menu can't show a reason.
            const items = can('members:manage')
              ? [
                  ...(roleChangeBlocked(member, all) ? [] : [{ label: 'Change role…', onSelect: () => setDialog({ kind: 'role', memberId: member.id }) }]),
                  ...(removalBlocked(member, all)
                    ? []
                    : [
                        {
                          label: member.status === 'invited' ? 'Cancel invitation' : 'Remove from workspace',
                          tone: 'danger' as const,
                          onSelect: () => setDialog({ kind: 'remove', memberId: member.id }),
                        },
                      ]),
                ]
              : [];
            return (
              <TableRow key={member.id}>
                <TableCell rowHeader>
                  <Stack gap="2xs">
                    <span>{name(member)}</span>
                    <Text as="span" size="caption" tone="muted">
                      {member.email}
                    </Text>
                  </Stack>
                </TableCell>
                <TableCell>{ROLE_LABELS[member.role]}</TableCell>
                <TableCell>
                  <Badge tone={STATUS_TONE[member.status]}>{member.status === 'active' ? 'Active' : 'Invited'}</Badge>
                </TableCell>
                <TableCell>{member.lastActiveAt ? format.relative(member.lastActiveAt) : member.invitedAt ? `Invited ${format.relative(member.invitedAt)}` : 'Not yet'}</TableCell>
                <TableCell>
                  {items.length > 0 ? (
                    <Menu
                      align="end"
                      trigger={
                        <Button variant="ghost" size="sm" icon="more" aria-label={`Actions for ${member.email}`}>
                          Actions
                        </Button>
                      }
                      items={items}
                    />
                  ) : (
                    <Text as="span" tone="muted" size="caption">
                      {member.isYou ? 'You' : can('members:manage') ? 'Only admin' : 'No actions'}
                    </Text>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {target && dialog?.kind === 'role' ? <RoleDialog member={target} members={all} initialRole={dialog.role} onClose={() => setDialog(undefined)} /> : null}
      {target && dialog?.kind === 'remove' ? <RemoveDialog member={target} onClose={() => setDialog(undefined)} /> : null}
    </>
  );
}

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role], description: ROLE_DESCRIPTIONS[role] }));
const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

/** A 4xx the person can act on, in words; anything else is a retry. */
const reasonFrom = (error: unknown) => (error instanceof ApiError && error.status < 500 ? error.message : 'The server hit a problem. Try again.');

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast();
  const invite = useInviteMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [error, setError] = useState<string | undefined>();
  const submit = () => {
    if (!isEmail(email)) return setError('Enter an email address, like name@company.com.');
    invite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: (member) => {
          onOpenChange(false);
          setEmail('');
          toast({ title: `Invitation sent to ${member.email}`, tone: 'success' });
        },
        onError: (e) => setError(reasonFrom(e)),
      },
    );
  };
  return (
    <Dialog
      title="Invite a member"
      description="They get an email with a link to join. You can change their role later."
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={invite.isPending}>
            Send invitation
          </Button>
        </>
      }
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="off"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setError(undefined);
        }}
        {...(error ? { error } : {})}
      />
      <RadioGroup label="Role" options={ROLE_OPTIONS} value={role} onValueChange={(value) => isRole(value) && setRole(value)} />
    </Dialog>
  );
}

/** The capabilities a role change adds and removes: the review step shows exactly what changes. */
const capabilityDiff = (from: Role, to: Role) => {
  const before = new Set<Capability>(ROLE_CAPABILITIES[from]);
  const after = new Set<Capability>(ROLE_CAPABILITIES[to]);
  return { gains: [...after].filter((c) => !before.has(c)), loses: [...before].filter((c) => !after.has(c)) };
};

function RoleDialog({ member, members, initialRole, onClose }: { member: Member; members: readonly Member[]; initialRole: Role | undefined; onClose: () => void }) {
  const toast = useToast();
  const format = useFormat();
  const change = useChangeRole();
  const [role, setRole] = useState<Role>(initialRole ?? member.role);
  const [error, setError] = useState<string | undefined>();
  const blocked = roleChangeBlocked(member, members, role);
  const diff = capabilityDiff(member.role, role);
  return (
    <Dialog
      title={`Change ${member.email}’s role`}
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={change.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              change.mutate(
                { member, role },
                {
                  onSuccess: () => {
                    onClose();
                    toast({ title: `${member.email} is now ${ROLE_LABELS[role].toLowerCase()}`, tone: 'success' });
                  },
                  onError: (e) => setError(reasonFrom(e)),
                },
              )
            }
            loading={change.isPending}
            disabled={role === member.role || Boolean(blocked)}
          >
            Change role
          </Button>
        </>
      }
    >
      <RadioGroup label="Role" options={ROLE_OPTIONS} value={role} onValueChange={(value) => isRole(value) && setRole(value)} />
      {role === member.role ? (
        <Text tone="muted">Choose a role to see what changes.</Text>
      ) : (
        <Stack gap="xs">
          <Text>
            <strong>Review:</strong> {ROLE_LABELS[member.role]} → {ROLE_LABELS[role]}.
          </Text>
          {diff.gains.length > 0 ? <Text size="caption">{`Gains ${format.list(diff.gains)}.`}</Text> : null}
          {diff.loses.length > 0 ? <Text size="caption">{`Loses ${format.list(diff.loses)}.`}</Text> : null}
        </Stack>
      )}
      {blocked || error ? <Banner tone="danger">{blocked ?? error ?? ''}</Banner> : null}
    </Dialog>
  );
}

function RemoveDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const toast = useToast();
  const tenant = useTenant();
  const remove = useRemoveMember();
  const [error, setError] = useState<string | undefined>();
  const invited = member.status === 'invited';
  return (
    <Dialog
      title={invited ? `Cancel the invitation for ${member.email}?` : `Remove ${member.email}?`}
      description={invited ? 'The link in their email stops working.' : `They lose access to ${WORKSPACES[tenant].name} at once. Records they own keep them as the owner.`}
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={remove.isPending}>
            Keep
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(member, {
                onSuccess: () => {
                  onClose();
                  toast({ title: invited ? 'Invitation cancelled' : `${member.email} removed`, tone: 'success' });
                },
                onError: (e) => setError(reasonFrom(e)),
              })
            }
          >
            {invited ? 'Cancel invitation' : 'Remove'}
          </Button>
        </>
      }
    >
      {error ? <Banner tone="danger">{error}</Banner> : null}
    </Dialog>
  );
}

// ---- audit log -------------------------------------------------------------------------------

const ACTION_OPTIONS = AUDIT_ACTIONS.map((action) => ({ value: action, label: AUDIT_LABELS[action], description: action }));
const OUTCOME_TONE: Record<AuditEvent['outcome'], BadgeTone> = { success: 'success', denied: 'danger' };

function AuditSection({ initialExpanded }: { initialExpanded: readonly string[] }) {
  const format = useFormat();
  const toast = useToast();
  const [url, nav] = useUrlState(auditCodec);
  const facets = useAuditFacets();
  // Calendar dates become instants in the reader's time zone: "Sep 1–25" means their days, not UTC's.
  const instants = url.from && url.to ? dayRangeToInstants({ start: url.from, end: url.to }, format.timeZone) : { from: '', to: '' };
  const filter = { actor: url.actor, actions: url.actions, ...instants };
  const log = useAuditLog({ ...filter, page: url.page, pageSize: PAGE_SIZE });
  const exporter = useExportAudit();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(initialExpanded));
  const refine = (next: Partial<AuditUrlState>) => nav.replace({ ...next, page: 1 });
  const filtered = Boolean(url.actor || url.actions.length > 0 || url.from);

  const actorOptions = (facets.data?.actors ?? []).map((a) => ({
    value: a.id,
    label: a.label,
    description: a.type === 'person' ? 'Person' : a.type === 'system' ? 'Automatic' : 'API key',
  }));

  return (
    <Stack gap="md">
      <Cluster gap="md" align="end">
        <Combobox label="Actor" placeholder="Anyone" options={actorOptions} value={url.actor || null} onValueChange={(actor) => refine({ actor: actor ?? '' })} size="sm" />
        <MultiSelect
          label="Events"
          placeholder="Any event"
          options={ACTION_OPTIONS}
          value={url.actions}
          onValueChange={(actions) => refine({ actions: actions as AuditAction[] })}
          size="sm"
        />
        <DateRangePicker
          label="Dates"
          size="sm"
          value={url.from && url.to ? { start: url.from, end: url.to } : null}
          onValueChange={(range) => refine(range ? { from: range.start, to: range.end } : { from: '', to: '' })}
        />
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={() => refine({ actor: '', actions: [], from: '', to: '' })}>
            Clear filters
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          icon="download"
          loading={exporter.isPending}
          onClick={() =>
            exporter.mutate(filter, {
              onSuccess: () => toast({ title: 'Exported', description: 'Every event matching these filters, as CSV.', tone: 'success' }),
              onError: () => toast({ title: 'The export failed', description: 'Try again.', tone: 'danger', duration: Infinity }),
            })
          }
        >
          Export CSV
        </Button>
      </Cluster>
      {log.isPending ? (
        <Skeleton shape="table-row" lines={8} columns={5} />
      ) : log.isError ? (
        <Banner
          tone="danger"
          title="The audit log didn’t load"
          action={
            <Button variant="secondary" onClick={() => void log.refetch()}>
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </Banner>
      ) : log.data.items.length === 0 ? (
        <EmptyState
          reason="no-results"
          title="No events match"
          description="Try another actor, event or date range."
          headingLevel={2}
          action={
            <Button variant="secondary" onClick={() => refine({ actor: '', actions: [], from: '', to: '' })}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <Table caption="Audit events, newest first">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Time</TableHeaderCell>
                <TableHeaderCell>Actor</TableHeaderCell>
                <TableHeaderCell>Event</TableHeaderCell>
                <TableHeaderCell>Target</TableHeaderCell>
                <TableHeaderCell>Outcome</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {log.data.items.map((event) => {
                const open = expanded.has(event.id);
                return (
                  <TableRow key={event.id}>
                    <TableCell>{format.dateTime(event.at, { withZone: true })}</TableCell>
                    <TableCell>
                      <Stack gap="2xs">
                        <span>{event.actor.label}</span>
                        {event.ip ? (
                          <Text as="span" size="caption" tone="muted">
                            <code>{event.ip}</code>
                          </Text>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell rowHeader>
                      <Stack gap="2xs" align="start">
                        <span>{AUDIT_LABELS[event.action]}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={open ? 'chevron-down' : 'chevron-right'}
                          aria-expanded={open}
                          onClick={() =>
                            setExpanded((before) => {
                              const next = new Set(before);
                              if (open) next.delete(event.id);
                              else next.add(event.id);
                              return next;
                            })
                          }
                        >
                          {open ? 'Hide details' : 'Details'}
                        </Button>
                        {open ? (
                          <CodeBlock
                            label={`Event ${event.id}`}
                            language="json"
                            code={JSON.stringify(
                              { id: event.id, action: event.action, at: event.at, actor: event.actor, target: event.target, ip: event.ip, changes: event.changes },
                              null,
                              2,
                            )}
                          />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{event.target.label}</TableCell>
                    <TableCell>
                      <Badge tone={OUTCOME_TONE[event.outcome]}>{event.outcome === 'success' ? 'Succeeded' : 'Denied'}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination
            label="Audit log pages"
            page={log.data.page}
            pageSize={log.data.pageSize}
            total={log.data.total}
            onPageChange={(page) => nav.push({ page })}
            formatNumber={format.number}
          />
        </>
      )}
    </Stack>
  );
}
