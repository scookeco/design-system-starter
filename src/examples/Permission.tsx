/**
 * How the example app shows a permission it doesn't have. One rule per context, applied everywhere:
 *
 *   page and bar actions   disabled, with the reason as visible text beside them (aria-describedby)
 *   overflow menu items    hidden (a menu can't show a reason)
 *   card actions           hidden (the board's Move to…)
 *   a whole page           the 403 page, from the route guard
 *
 * Every one of them asks `can` (src/app/model/permissions.ts), the same predicate the mutation
 * refuses with and the mock server answers 403 with.
 */
import type { ReactNode } from 'react';
import { Text } from '../index';
import type { Capability } from '../app/api/schemas';
import { usePermission, type Permission } from '../app/session';
import { ForbiddenPage } from './ErrorPages';

/** The reason a control is disabled, as visible text the control points at. Nothing when allowed. */
export function PermissionNote({ permission }: { permission: Permission }) {
  if (permission.allowed) return null;
  return (
    <Text id={permission.reasonId} size="caption" tone="muted">
      {permission.reason}
    </Text>
  );
}

/** Props for a control a permission may disable: spread onto the Button. */
export const gated = (permission: Permission) => (permission.allowed ? {} : { disabled: true, 'aria-describedby': permission.reasonId });

export interface GuardProps {
  capability: Capability;
  /** The primary nav item the denied page belongs under. */
  current: string;
  children: ReactNode;
}

/** The route guard: the page, or the 403 page in its place. The route table uses this for every route. */
export function Guard({ capability, current, children }: GuardProps) {
  const permission = usePermission(capability);
  return permission.allowed ? <>{children}</> : <ForbiddenPage current={current} reason={permission.reason} />;
}
