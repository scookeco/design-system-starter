import { useContext, type ReactNode } from 'react';
import { DocumentScopeContext, type PartyKind, type PartyPosition } from '../Document/documentIndex';

export type { PartyKind };

/**
 * Declares the parties a document names by role: who signs, who is copied, who witnesses, in which
 * order. Declare every role before the fields that use it. Not shown: the document names its parties
 * in its own text; this is what fields, signatures and routing read.
 */
export function Parties({ children }: { children: ReactNode }) {
  return (
    <section className="parties" data-doc="parties" hidden>
      {children}
    </section>
  );
}

/** A party's colour (color.category.N), the same on every field it completes. */
export type PartyColor = 1 | 2 | 3 | 4 | 5 | 6;

export interface PartyProps {
  /** The role id fields and signatures use ("customer", "employee"). Required. */
  role: string;
  /** What the document calls the party ("Fontara, Inc.", "Employee"). Required. */
  name: string;
  /** How it takes part. Default signer. */
  kind?: PartyKind;
  /** Routing order: parties with the same order act in parallel. Default 1. */
  order?: number;
  /** Its colour. Default: by the order parties are declared. */
  color?: PartyColor;
}

/** One party in Parties. */
export function Party({ role, name, kind = 'signer', order = 1, color }: PartyProps) {
  return <div className="parties__party" data-doc="party" data-role={role} data-name={name} data-kind={kind} data-order={String(order)} data-color={color === undefined ? undefined : String(color)} />;
}

/** The declared party for a role, if any. */
export function useParty(role: string | undefined): PartyPosition | undefined {
  const doc = useContext(DocumentScopeContext);
  return role ? doc?.index.parties[role] : undefined;
}
