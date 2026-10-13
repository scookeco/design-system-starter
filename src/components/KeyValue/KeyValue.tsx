import type { ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import './KeyValue.css';

export interface KeyValueProps {
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** One KeyValueItem per pair. Required. */
  children: ReactNode;
}

/**
 * Label and value pairs in a document: an invoice's number, date and terms; its subtotal, tax and
 * total. Labels sit beside their values, values aligned at the end.
 */
export function KeyValue({ area, children }: KeyValueProps) {
  return (
    <dl className="key-value" data-doc="kv" style={areaStyle(area)}>
      {children}
    </dl>
  );
}

export interface KeyValueItemProps {
  /** The label ("Invoice", "Terms"). Required. */
  label: string;
  /** The value: text formatted with useFormat, or a computed value. */
  children: ReactNode;
  /** Sets the pair in bold, as a total. */
  emphasis?: boolean;
}

/** One pair of a KeyValue. */
export function KeyValueItem({ label, children, emphasis = false }: KeyValueItemProps) {
  return (
    <div className="key-value__item" data-emphasis={emphasis ? 'true' : undefined}>
      <dt className="key-value__label">{label}</dt>
      <dd className="key-value__value">{children}</dd>
    </div>
  );
}
