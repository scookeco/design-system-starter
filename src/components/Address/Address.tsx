import type { ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import './Address.css';

export interface AddressProps {
  /** The data key the address belongs to ("bill_to"), for exports and forms that fill it. */
  name?: string;
  /** What it is, shown above it ("Bill to"). */
  label?: string;
  /** The address, one line per item ("Globex Inc.", "1 Main St", "Seattle, WA 98101"). Required. */
  lines: readonly string[];
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/** A postal address block in a document: an invoice's bill-to, a letter's recipient, an issuer's address. */
export function Address({ name, label, lines, area }: AddressProps): ReactNode {
  return (
    <div className="address" style={areaStyle(area)}>
      {label ? <p className="address__label">{label}</p> : null}
      <address className="address__lines" data-doc="address" data-name={name}>
        {lines.map((line, i) => (
          <span key={i} className="address__line">
            {line}
          </span>
        ))}
      </address>
    </div>
  );
}
