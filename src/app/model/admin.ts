/**
 * The admin console's reads and named mutations: members and the audit log. Member writes are
 * pessimistic: an admin action changes what someone else can do, the server decides (last admin,
 * your own role), and every one lands in the audit log, so the log is refetched after each.
 *
 *   verb            presents      patches                     invalidates
 *   inviteMember    pessimistic   members (appends)           members, audit
 *   changeRole      pessimistic   the member (versioned)      members, audit
 *   removeMember    pessimistic   members (removes)           members, audit
 *   exportAudit     a read        nothing                     nothing (every event matching the filters)
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteMember, getAuditExport, getAuditFacets, listAudit, listMembers, patchMemberRole, postInvite, type AuditQuery, type Member } from '../api/admin';
import { ApiError } from '../api/client';
import type { Capability, Role } from '../api/schemas';
import { useGrant, usePartition } from '../session';
import { useTenant } from '../tenant';
import type { Partition } from './keys';
import { removalBlocked, roleChangeBlocked } from './members';
import { can, DENIAL_REASONS, type Grant } from './permissions';

export const adminKeys = {
  members: (p: Partition) => [...p, 'members', {}] as const,
  audit: (p: Partition) => [...p, 'audit'] as const,
  auditPage: (p: Partition, query: AuditQuery) => [...p, 'audit', query] as const,
  auditFacets: (p: Partition) => [...p, 'audit', 'facets'] as const,
};

const refuseUnless = (grant: Grant, capability: Capability) => {
  if (!can(grant, capability)) throw new ApiError(403, 'forbidden', DENIAL_REASONS[capability]);
};

export function useMembers() {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: adminKeys.members(partition), queryFn: ({ signal }) => listMembers(tenant, signal), select: (data) => data.items });
}

/** One page of the audit log for a filter, newest first. The previous page stays while the next loads. */
export function useAuditLog(query: AuditQuery, { enabled = true }: { enabled?: boolean } = {}) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: adminKeys.auditPage(partition, query), queryFn: ({ signal }) => listAudit(tenant, query, signal), placeholderData: keepPreviousData, enabled });
}

export function useAuditFacets({ enabled = true }: { enabled?: boolean } = {}) {
  const tenant = useTenant();
  const partition = usePartition();
  return useQuery({ queryKey: adminKeys.auditFacets(partition), queryFn: ({ signal }) => getAuditFacets(tenant, signal), enabled });
}

function useAdminWrite<V, R>(name: string, write: (variables: V, members: readonly Member[]) => Promise<R>, patch: (members: Member[], result: R, variables: V) => Member[]) {
  const partition = usePartition();
  const grant = useGrant();
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...partition, name],
    mutationFn: (variables: V) => {
      refuseUnless(grant, 'members:manage');
      return write(variables, client.getQueryData<{ items: Member[] }>(adminKeys.members(partition))?.items ?? []);
    },
    onSuccess: (result, variables) => {
      client.setQueryData<{ items: Member[] }>(adminKeys.members(partition), (data) => (data ? { items: patch(data.items, result, variables) } : data));
      return Promise.all([client.invalidateQueries({ queryKey: adminKeys.members(partition) }), client.invalidateQueries({ queryKey: adminKeys.audit(partition) })]);
    },
  });
}

/** inviteMember: an email and a role; the invitation shows as "Invited" until they join. */
export function useInviteMember() {
  const tenant = useTenant();
  return useAdminWrite(
    'inviteMember',
    (invite: { email: string; role: Role }) => postInvite(tenant, invite),
    (members, created) => [...members, created],
  );
}

/** changeRole: refused here, before any request, for your own role or the last admin (the server refuses too). */
export function useChangeRole() {
  const tenant = useTenant();
  return useAdminWrite(
    'changeRole',
    ({ member, role }: { member: Member; role: Role }, members) => {
      const blocked = roleChangeBlocked(member, members, role);
      if (blocked) throw new ApiError(409, 'blocked', blocked);
      return patchMemberRole(tenant, member.id, role, member.version);
    },
    (members, changed) => members.map((m) => (m.id === changed.id ? changed : m)),
  );
}

/** removeMember: they lose access to the workspace at once. Refused for yourself and the last admin. */
export function useRemoveMember() {
  const tenant = useTenant();
  return useAdminWrite(
    'removeMember',
    (member: Member, members) => {
      const blocked = removalBlocked(member, members);
      if (blocked) throw new ApiError(409, 'blocked', blocked);
      return deleteMember(tenant, member.id);
    },
    (members, _result, removed) => members.filter((m) => m.id !== removed.id),
  );
}

/** exportAudit: every event matching the filters as CSV (the server builds it), handed to the browser as a download. */
export function useExportAudit() {
  const tenant = useTenant();
  const grant = useGrant();
  const partition = usePartition();
  return useMutation({
    mutationKey: [...partition, 'exportAudit'],
    mutationFn: async (query: Omit<AuditQuery, 'page' | 'pageSize'>) => {
      refuseUnless(grant, 'audit:read');
      const file = await getAuditExport(tenant, query);
      const url = URL.createObjectURL(new Blob([file.content], { type: file.contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
      return file;
    },
  });
}

/**
 * A calendar-date range as the instants it covers in a time zone: from the start of the first day
 * to the start of the day after the last (exclusive). "Sep 1 – Sep 25" in Tokyo is not the same
 * span of time as in Los Angeles, and neither is UTC midnight to UTC midnight.
 */
export const dayRangeToInstants = (range: { start: string; end: string }, timeZone: string): { from: string; to: string } => ({
  from: startOfDay(range.start, timeZone).toISOString(),
  to: startOfDay(nextDay(range.end), timeZone).toISOString(),
});

const nextDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/** The zone's offset from UTC at an instant, in ms (east positive), from Intl: no date library. */
const offsetAt = (instant: number, timeZone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - Math.floor(instant / 1000) * 1000;
};

/** Local midnight of a calendar date in a zone, as an instant. Twice round, so a DST change that day lands right. */
const startOfDay = (iso: string, timeZone: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const wall = Date.UTC(y, m - 1, d);
  let instant = wall - offsetAt(wall, timeZone);
  instant = wall - offsetAt(instant, timeZone);
  return new Date(instant);
};
