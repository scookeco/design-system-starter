import type { ReactNode } from 'react';
import { Text } from '../Text/Text';
import './SignaturePage.css';

export interface SignaturePageProps {
  /** The execution line. Default: IN WITNESS WHEREOF, the Parties have executed this Agreement by their duly authorized representatives. */
  witness?: string;
  /** One SignatureParty per party: 1, 2 or 3 (an escrow agreement's three). Required. */
  children: ReactNode;
}

/**
 * The execution page that ends an agreement: the “IN WITNESS WHEREOF” line, then each party's
 * name and SignatureBlock. Parties sit in equal columns at least size.grid-item.md wide, two on a
 * page: a third moves to the second row, under the first; a single party keeps a column's width.
 */
export function SignaturePage({ witness = 'IN WITNESS WHEREOF, the Parties have executed this Agreement by their duly authorized representatives.', children }: SignaturePageProps) {
  return (
    <section className="signature-page" aria-label="Signatures">
      <Text size="body-lg">{witness}</Text>
      <div className="signature-page__parties">{children}</div>
    </section>
  );
}

export interface SignaturePartyProps {
  /** The party, as the agreement names it ("Acme Corp"): shown in capitals. Required. */
  name: string;
  /** The party's SignatureBlock, in its recipient's colour. Required. */
  children: ReactNode;
}

/** One party on a SignaturePage: its name over its SignatureBlock. */
export function SignatureParty({ name, children }: SignaturePartyProps) {
  return (
    <div className="signature-party">
      <p className="signature-party__name">{name}</p>
      {children}
    </div>
  );
}
