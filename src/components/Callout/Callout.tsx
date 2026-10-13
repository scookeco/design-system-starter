import type { ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import './Callout.css';

/** What a callout is: a note, a warning, or instructions for whoever fills the document in. */
export type CalloutKind = 'note' | 'warning' | 'instruction';

const LABEL: Record<CalloutKind, string> = { note: 'Note', warning: 'Warning', instruction: 'Instructions' };

export interface CalloutProps {
  /** Default note. */
  kind?: CalloutKind;
  /** Its own heading instead of the kind's word ("Before you sign"). */
  title?: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** The text. Required. */
  children: ReactNode;
}

/**
 * A notice inside a document, set apart from its text: a note, a warning, or instructions (a form's
 * “Complete Step 2 only if…”). Part of the document, so it prints with it and never announces
 * itself; for a message about the app, use Banner.
 */
export function Callout({ kind = 'note', title, area, children }: CalloutProps) {
  return (
    <aside className="callout" data-doc="callout" data-kind={kind} style={areaStyle(area)}>
      <p className="callout__title">{title ?? LABEL[kind]}</p>
      <div className="callout__body">{children}</div>
    </aside>
  );
}
