import type { ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import { EditIcon } from '../Icon/icons';
import './SignatureBlock.css';

/** A recipient's colour (color.category.*): the same for every field that recipient completes. */
export type SignatureRecipient = 1 | 2 | 3 | 4 | 5 | 6;

export interface SignatureBlockProps extends EscapeHatch {
  /** The signer's name, shown once signed ("Maya Okafor"). Also names the Sign button. Required. */
  name: string;
  /** The signer's title, shown once signed ("Legal counsel"). */
  title?: string;
  /** The adopted signature, drawn on the line. Setting it makes the block signed. */
  signature?: string;
  /** The date signed, formatted for the reader (useFormat). Shown once signed. */
  date?: string;
  /** The recipient's colour for the field tags. Defaults to 1. */
  recipient?: SignatureRecipient;
  /** Makes the Sign tag a button that starts signing (the app's adopt-signature flow). */
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
 * The signature block at the end of a generated document, one per signer, laid out as e-signature
 * tags it: Signature, Name, Title and Date Signed, each label followed by a field tag in the
 * recipient's colour. Signed, the signature is drawn on its line and the values read as plain text.
 * Every value keeps the space of the tag it replaces, so nothing moves when the document is signed.
 */
export function SignatureBlock({ name, title, signature, date, recipient = 1, onSign, UNSAFE_className, UNSAFE_style }: SignatureBlockProps) {
  const signed = Boolean(signature);
  const tag = (text: string) => <span className="signature-block__tag">{text}</span>;
  const signTag = (
    <>
      <span>Sign</span>
      <Icon icon={EditIcon} />
    </>
  );

  return (
    <dl className={cx('signature-block', UNSAFE_className)} style={UNSAFE_style} data-recipient={String(recipient)} data-signed={signed ? 'true' : undefined}>
      <Row label={LABELS.signature} signature>
        <span className="signature-block__slot">
          {signed ? (
            <span className="signature-block__signature">{signature}</span>
          ) : onSign ? (
            <button type="button" className="signature-block__tag signature-block__sign" onClick={onSign} aria-label={`Sign as ${name}`}>
              {signTag}
            </button>
          ) : (
            <span className="signature-block__tag signature-block__sign">{signTag}</span>
          )}
        </span>
      </Row>
      <Row label={LABELS.name}>{signed ? <span className="signature-block__text">{name}</span> : tag('Full Name')}</Row>
      <Row label={LABELS.title}>{signed ? <span className="signature-block__text">{title}</span> : tag('Title')}</Row>
      <Row label={LABELS.date}>{signed ? <span className="signature-block__text">{date}</span> : tag('Date Signed')}</Row>
    </dl>
  );
}
