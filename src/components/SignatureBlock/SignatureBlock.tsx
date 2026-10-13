import type { ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { useDocumentData } from '../Document/data';
import { DateSigned, Signature, SignerDetail } from '../Signature/Signature';
import './SignatureBlock.css';

export interface SignatureBlockProps extends EscapeHatch {
  /** The party who signs here (a role from Parties): its colour, and its signer's details from the document's values. Required. */
  role: string;
  /** Makes the Sign tag a button, while the party can act, that starts the app's adopt-signature flow. */
  onSign?: () => void;
}

const LABELS = { signature: 'Signature', name: 'Name', title: 'Title', date: 'Date Signed' } as const;

function Row({ label, children, signature = false }: { label: string; children: ReactNode; signature?: boolean }) {
  return (
    <div className="signature-block__row" data-signature={signature ? 'true' : undefined}>
      <dt className="signature-block__label">{label}:</dt>
      <dd className="signature-block__value">{children}</dd>
    </div>
  );
}

/**
 * A party's signature block, laid out as e-signature tags it: Signature, Name, Title and Date
 * Signed, each a tag in the party's colour until it signs. Signed, the signature is drawn on its
 * line and the values read as plain text in the place their tags held. Bound to a role, never a
 * person: the signer's name and title are the document's `<role>_signer_name` and `_signer_title`.
 */
export function SignatureBlock({ role, onSign, UNSAFE_className, UNSAFE_style }: SignatureBlockProps) {
  const data = useDocumentData();
  const signatures = data.values.signature;
  const signed = signatures !== null && typeof signatures === 'object' && Boolean((signatures as Record<string, unknown>)[role]);
  return (
    <dl className={cx('signature-block', UNSAFE_className)} style={UNSAFE_style} data-role={role} data-signed={signed ? 'true' : undefined}>
      <Row label={LABELS.signature} signature>
        <Signature role={role} onSign={onSign} />
      </Row>
      <Row label={LABELS.name}>
        <SignerDetail role={role} name={`${role}_signer_name`} tag="Full Name" signed={signed} />
      </Row>
      <Row label={LABELS.title}>
        <SignerDetail role={role} name={`${role}_signer_title`} tag="Title" signed={signed} />
      </Row>
      <Row label={LABELS.date}>
        <DateSigned role={role} />
      </Row>
    </dl>
  );
}
