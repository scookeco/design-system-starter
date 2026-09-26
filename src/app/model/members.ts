/**
 * The admin console's domain rules, named once: the members page (what it enables and hides), the
 * mutations (what they refuse) and the mock server (what it answers 403 or 409) all call these.
 */
import type { Member } from '../api/admin';
import type { Role } from '../api/schemas';

export const isAdmin = (member: Pick<Member, 'role' | 'status'>) => member.role === 'admin' && member.status === 'active';

/** The only active admin left: taking away their role or their membership would lock everyone out of the admin console. */
export const isLastAdmin = (member: Pick<Member, 'id' | 'role' | 'status'>, members: readonly Pick<Member, 'id' | 'role' | 'status'>[]) =>
  isAdmin(member) && members.filter(isAdmin).every((m) => m.id === member.id);

/** Why a member's role can't be changed, or undefined when it can. */
export const roleChangeBlocked = (member: Pick<Member, 'id' | 'role' | 'status' | 'isYou'>, members: readonly Pick<Member, 'id' | 'role' | 'status'>[], next?: Role): string | undefined => {
  if (member.isYou) return 'You can’t change your own role. Ask another admin.';
  if (next !== undefined && next !== 'admin' && isLastAdmin(member, members)) return 'This is the only admin. Make someone else an admin first.';
  return undefined;
};

/** Why a member can't be removed, or undefined when they can. */
export const removalBlocked = (member: Pick<Member, 'id' | 'role' | 'status' | 'isYou'>, members: readonly Pick<Member, 'id' | 'role' | 'status'>[]): string | undefined => {
  if (member.isYou) return 'You can’t remove yourself. Ask another admin.';
  if (isLastAdmin(member, members)) return 'This is the only admin. Make someone else an admin first.';
  return undefined;
};

export const ROLE_LABELS: Record<Role, string> = { viewer: 'Viewer', editor: 'Editor', admin: 'Admin' };

/** A plausible email: something@something.tld. The server checks it again. */
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
