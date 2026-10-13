import type { ReactNode } from 'react';
import './Letterhead.css';

export interface LetterheadProps {
  /** The issuer's mark: a logo image or an Avatar. */
  logo?: ReactNode;
  /** The issuer's block: its name and an Address. Required. */
  children: ReactNode;
}

/**
 * The issuer's letterhead at the top of a letter, an invoice or a certificate: its mark beside its
 * name and address, above a rule. First page only: running text on later pages is a DocumentHeader.
 */
export function Letterhead({ logo, children }: LetterheadProps) {
  return (
    <header className="letterhead" data-doc="letterhead">
      {logo ? <div className="letterhead__logo">{logo}</div> : null}
      <div className="letterhead__issuer">{children}</div>
    </header>
  );
}
