import type { ReactNode } from 'react';
import { DocumentPage } from '../Document/Document';
import { useParty } from '../Parties/Parties';
import { SignatureBlock } from '../SignatureBlock/SignatureBlock';
import { Text } from '../Text/Text';
import './SignaturePage.css';

export interface SignaturePageProps {
  /** The execution line. Default: IN WITNESS WHEREOF, the Parties have executed this Agreement by their duly authorized representatives. */
  witness?: string;
  /** One SignatureParty per party: 1, 2 or 3 (an escrow agreement's three). Required. */
  children: ReactNode;
}

/**
 * The execution page that ends an agreement, a DocumentPage of its own (it starts a new printed
 * page): the “IN WITNESS WHEREOF” line, then each party's name and SignatureBlock. Parties sit in
 * equal columns at least size.grid-item.md wide, two on a page: a third moves to the second row,
 * under the first; a single party keeps a column's width.
 */
export function SignaturePage({ witness = 'IN WITNESS WHEREOF, the Parties have executed this Agreement by their duly authorized representatives.', children }: SignaturePageProps) {
  return (
    <DocumentPage>
      <section className="signature-page" aria-label="Signatures">
        <Text size="body-lg">{witness}</Text>
        <div className="signature-page__parties">{children}</div>
      </section>
    </DocumentPage>
  );
}

export interface SignaturePartyProps {
  /** The party (a role from Parties): its name, shown in capitals, and its SignatureBlock. Required. */
  role: string;
  /** Overrides the name Parties gives it. */
  name?: string;
  /** Overrides the party's SignatureBlock (a block with onSign, or two signers for one party). */
  children?: ReactNode;
}

/** One party on a SignaturePage: its name over its SignatureBlock. */
export function SignatureParty({ role, name, children }: SignaturePartyProps) {
  const party = useParty(role);
  return (
    <div className="signature-party" data-role={role}>
      <p className="signature-party__name">{name ?? party?.name ?? role}</p>
      {children ?? <SignatureBlock role={role} />}
    </div>
  );
}
