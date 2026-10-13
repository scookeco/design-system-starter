import type { ReactNode } from 'react';
import { useFormat } from '../../format/LocaleProvider';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { useCapture, useDocumentData } from '../Document/data';
import { Icon } from '../Icon/Icon';
import { EditIcon } from '../Icon/icons';
import { useParty } from '../Parties/Parties';
import './Signature.css';

/** Where a party's signing values live in the document's values: signature.<role>, initials.<role>, date_signed.<role>. */
const valueOf = (values: Readonly<Record<string, unknown>>, group: 'signature' | 'initials' | 'date_signed', role: string) => {
  const byRole = values[group];
  const v = byRole !== null && typeof byRole === 'object' ? (byRole as Record<string, unknown>)[role] : undefined;
  return typeof v === 'string' && v !== '' ? v : null;
};

function useSigning(role: string, group: 'signature' | 'initials' | 'date_signed', doc: string) {
  const data = useDocumentData();
  const capture = useCapture(role);
  const party = useParty(role);
  return {
    value: valueOf(data.values, group, role),
    party,
    editable: capture.editable,
    common: {
      'data-doc': doc,
      'data-role': role,
      'data-recipient': String(party?.color ?? 1),
    },
  };
}

export interface SignatureProps {
  /** The party who signs here (a role from Parties). Required. */
  role: string;
  required?: boolean;
  /** Makes the Sign tag a button, while the party can act, that starts the app's adopt-signature flow. */
  onSign?: () => void;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/**
 * Where a party signs (a sign-here tab): a Sign tag in the party's colour until it is signed, then
 * the signature drawn on its line, in the same space. The adopted signature is the document's
 * `signature.<role>` value.
 */
export function Signature({ role, required = true, onSign, area }: SignatureProps) {
  const { value, party, editable, common } = useSigning(role, 'signature', 'signature');
  const label = `Sign as ${party?.name ?? role}`;
  const tag: ReactNode = (
    <>
      <span>Sign</span>
      <Icon icon={EditIcon} />
    </>
  );
  return (
    <span className="signature-field" {...common} data-required={required ? 'true' : undefined} style={areaStyle(area)}>
      <span className="signature-field__slot">
        {value ? (
          <span className="signature-field__drawn">{value}</span>
        ) : onSign && editable ? (
          <button type="button" className="signature-field__tag signature-field__sign" onClick={onSign} aria-label={label}>
            {tag}
          </button>
        ) : (
          <span className="signature-field__tag signature-field__sign">{tag}</span>
        )}
      </span>
    </span>
  );
}

export interface InitialsProps {
  /** The party who initials (a role from Parties). Required. */
  role: string;
  /** One on every printed page, in the page's corner. */
  eachPage?: boolean;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/** Where a party initials (an initial-here tab), in its colour; `eachPage` repeats it on every printed page. */
export function Initials({ role, eachPage = false, area }: InitialsProps) {
  const { value, common } = useSigning(role, 'initials', 'initials');
  return (
    <span className="signature-field" {...common} data-each-page={eachPage ? 'true' : undefined} style={areaStyle(area)}>
      {value ? <span className="signature-field__drawn signature-field__drawn--initials">{value}</span> : <span className="signature-field__tag">Initial</span>}
    </span>
  );
}

export interface DateSignedProps {
  /** The party whose signing date it is. Required. */
  role: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/** The date a party signed, filled in at signing (a date-signed tab): a tag until then. */
export function DateSigned({ role, area }: DateSignedProps) {
  const { value, common } = useSigning(role, 'date_signed', 'date-signed');
  const format = useFormat();
  return (
    <span className="signature-field" {...common} style={areaStyle(area)}>
      {value ? <span className="signature-field__text">{format.date(value)}</span> : <span className="signature-field__tag">Date Signed</span>}
    </span>
  );
}

/** A signer's name or title in a SignatureBlock: a tag (a full-name or title tab, filled at signing) until signed, then the value. */
export function SignerDetail({ role, name, tag, signed }: { role: string; name: string; tag: string; signed: boolean }) {
  const data = useDocumentData();
  const { role: resolved } = useCapture(role);
  const party = useParty(role);
  const value = data.values[name];
  return (
    <span className="signature-field" data-doc="field" data-name={name} data-type="text" data-role={resolved} data-recipient={String(party?.color ?? 1)}>
      {signed ? <span className="signature-field__text">{typeof value === 'string' ? value : ''}</span> : <span className="signature-field__tag">{tag}</span>}
    </span>
  );
}
