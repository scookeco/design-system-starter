/**
 * Permissions, defined once.
 *
 *   role ──(ROLE_CAPABILITIES, the one mapping)──▶ capability set ──▶ can(grant, capability, subject?)
 *                                                                        ├─ button: shown / disabled with a reason
 *                                                                        ├─ route guard: page / 403 page
 *                                                                        ├─ mutation: sends / refuses without a request
 *                                                                        └─ mock server: 200 / 403
 *
 * The server derives capabilities from the role (here, for the mock) and sends them with the
 * session; the client only ever reads the capability list it was given. `can` then adds the
 * object-level rule for the thing being acted on (an archived record can't be renamed, one on legal
 * hold can't be deleted), from the same named predicates the rest of the app uses.
 */
import type { Capability, RecordEntity, Role } from '../api/schemas';
import { canArchive, canDelete, canMove, canRename, isDraft } from './predicates';

const VIEWER = ['record:read', 'account:read'] as const satisfies readonly Capability[];
const EDITOR = [...VIEWER, 'record:read-drafts', 'record:create', 'record:rename', 'record:move', 'record:archive', 'account:create', 'people:create'] as const satisfies readonly Capability[];
const ADMIN = [...EDITOR, 'record:delete', 'account:edit'] as const satisfies readonly Capability[];

/** The ONE place roles map to capabilities. A new role, or a capability moving between roles, is an edit here. */
export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = { viewer: VIEWER, editor: EDITOR, admin: ADMIN };

/** What a permission check needs: the capabilities the server granted in this workspace. */
export interface Grant {
  capabilities: readonly Capability[];
}

/** Object-level rules: the capability is necessary; the thing acted on must also allow it. */
type Subject = Pick<RecordEntity, 'status' | 'tags'>;
const SUBJECT_RULES: Partial<Record<Capability, (subject: Subject) => boolean>> = {
  'record:rename': canRename,
  'record:move': canMove,
  'record:archive': canArchive,
  'record:delete': canDelete,
};

/**
 * THE permission predicate. Without a subject: may this person do this at all (show the control)?
 * With one: may they do it to this thing (enable the control, let the write through)?
 */
export const can = (grant: Grant, capability: Capability, subject?: Subject): boolean =>
  grant.capabilities.includes(capability) && (subject === undefined || (SUBJECT_RULES[capability]?.(subject) ?? true));

/** Roles shape projections: a record a grant can't see is filtered out in the query (server-side), not after it. */
export const canSee = (grant: Grant, record: Pick<RecordEntity, 'status'>) => !isDraft(record) || grant.capabilities.includes('record:read-drafts');

/** What a person is told when a capability is missing: what they can't do, and who can change that. */
export const DENIAL_REASONS: Record<Capability, string> = {
  'record:read': 'You don’t have access to records in this workspace. Ask a workspace admin.',
  'record:read-drafts': 'Drafts are visible to editors. Ask a workspace admin for editor access.',
  'record:create': 'You have view-only access, so you can’t create records. Ask a workspace admin for editor access.',
  'record:rename': 'You have view-only access, so you can’t rename records. Ask a workspace admin for editor access.',
  'record:move': 'You have view-only access, so you can’t move records. Ask a workspace admin for editor access.',
  'record:archive': 'You have view-only access, so you can’t archive records. Ask a workspace admin for editor access.',
  'record:delete': 'Only workspace admins can delete records.',
  'account:read': 'You don’t have access to accounts in this workspace. Ask a workspace admin.',
  'account:create': 'You have view-only access, so you can’t add accounts. Ask a workspace admin for editor access.',
  'account:edit': 'Only workspace admins can edit accounts.',
  'people:create': 'You have view-only access, so you can’t add people. Ask a workspace admin for editor access.',
};
