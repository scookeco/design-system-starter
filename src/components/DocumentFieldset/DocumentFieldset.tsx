import type { ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { RoleContext } from '../Document/data';
import './DocumentFieldset.css';

export interface DocumentFieldsetProps {
  /** What the fields are together ("Employer"). Required. */
  legend: string;
  /** The party who fills these in: every field inside takes it unless it says otherwise. */
  role?: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** The fields. Required. */
  children: ReactNode;
}

/** A group of related fields in a document, named by its legend; `role` assigns them all to one party. */
export function DocumentFieldset({ legend, role, area, children }: DocumentFieldsetProps) {
  const fieldset = (
    <fieldset className="document-fieldset" data-doc="fieldset" data-role={role} style={areaStyle(area)}>
      <legend className="document-fieldset__legend">{legend}</legend>
      {children}
    </fieldset>
  );
  return role ? <RoleContext value={role}>{fieldset}</RoleContext> : fieldset;
}
