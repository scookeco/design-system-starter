import type { ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { RoleContext } from '../Document/data';
import './RoleRegion.css';

export interface RoleRegionProps {
  /** The party every field inside is for (a role from Parties). Required. */
  role: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** Any part of the document: text, fields, steps. Required. */
  children: ReactNode;
}

/**
 * A part of a document that belongs to one party (a form's “Employers only” block): every field
 * inside is that party's unless it says otherwise. Assigns the role only; it draws nothing of its own.
 */
export function RoleRegion({ role, area, children }: RoleRegionProps) {
  return (
    <RoleContext value={role}>
      <div className="role-region" data-doc="role-region" data-role={role} style={areaStyle(area)}>
        {children}
      </div>
    </RoleContext>
  );
}
