import { useEffect, useId, useRef, useState } from 'react';
import { currencyDigits } from '../../format/format';
import { useFormat } from '../../format/LocaleProvider';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { useCapture, useField } from '../Document/data';
import './DocumentField.css';

/** What a field holds, which sets its input, its stored value and how it reads. */
export type DocumentFieldType = 'text' | 'number' | 'currency' | 'date' | 'duration' | 'email' | 'phone' | 'ssn' | 'ein' | 'textarea';

export interface DocumentFieldProps {
  /** The data key it reads and writes ("first_name"; in a Repeat row, the row's own key). Required. */
  name: string;
  /** What it is, as a person filling it in needs it named ("First name and middle initial"). Required. */
  label: string;
  /** Show the label above the field, as a form's box does. Default: named for assistive technology only (a blank in a sentence). */
  showLabel?: boolean;
  /** Default text. */
  type?: DocumentFieldType;
  /** The party who fills it in (a role from Parties). Default: the enclosing fieldset's or role region's. */
  role?: string;
  required?: boolean;
  /** A pattern the value must match (ssn and ein have one). */
  pattern?: string;
  /** Shown while the value is empty and the document is not editable (“the date the last party signs”). */
  placeholder?: string;
  /** When it fills while shown, say so in the viewer's live region: "Effective date" → “Effective date filled: …”. */
  announceAs?: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

const INPUT: Record<DocumentFieldType, { type: string; inputMode?: 'decimal' | 'numeric' | 'tel' | 'email'; pattern?: string; autoComplete?: string }> = {
  text: { type: 'text' },
  number: { type: 'text', inputMode: 'decimal', pattern: '-?[0-9]*[.,]?[0-9]*' },
  currency: { type: 'text', inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]*' },
  date: { type: 'date' },
  duration: { type: 'text' },
  email: { type: 'email', inputMode: 'email', autoComplete: 'email' },
  phone: { type: 'tel', inputMode: 'tel', autoComplete: 'tel' },
  ssn: { type: 'text', inputMode: 'numeric', pattern: '[0-9]{3}-?[0-9]{2}-?[0-9]{4}', autoComplete: 'off' },
  ein: { type: 'text', inputMode: 'numeric', pattern: '[0-9]{2}-?[0-9]{7}', autoComplete: 'off' },
  textarea: { type: 'text' },
};

/** What is stored for what was typed: numbers as numbers, money as integer minor units, the rest as text. */
const stored = (type: DocumentFieldType, text: string, currency: string): unknown => {
  if (text.trim() === '') return null;
  if (type === 'number') return Number(text.replace(',', '.'));
  if (type === 'currency') return Math.round(Number(text.replace(',', '.')) * 10 ** currencyDigits(currency));
  return text;
};

/** What a stored value looks like while editing: minor units back to a decimal amount. */
const editText = (type: DocumentFieldType, value: unknown, currency: string): string => {
  if (value === null || value === undefined) return '';
  if (type === 'currency' && typeof value === 'number') return (value / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency));
  return String(value);
};

/**
 * A value in a document, bound to a data key: a blank that is filled, or a value merged from data.
 * While the Document is editable (lifecycle filled or negotiated) it is an input in the line of
 * text or the box of the form; otherwise it reads as plain document text, formatted for its type,
 * and an empty one is a blank line (or its placeholder). In print an input is a line to write on.
 */
export function DocumentField({ name, label, showLabel = false, type = 'text', role, required = false, pattern, placeholder, announceAs, area }: DocumentFieldProps) {
  const { data, path, value, set } = useField(name);
  const format = useFormat();
  const capture = useCapture(role);
  const hidden = capture.hidden;
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const empty = value === null || value === undefined || value === '';

  // A value that fills while shown (a signer's name arriving) is tinted for a moment and announced.
  const wasEmpty = useRef(empty);
  const [justFilled, setJustFilled] = useState(false);
  useEffect(() => {
    if (!capture.editable && wasEmpty.current && !empty) {
      setJustFilled(true);
      if (announceAs) data.announce(`${announceAs} filled: ${String(value)}`);
    }
    wasEmpty.current = empty;
  }, [empty, value, announceAs, data, capture.editable]);

  const readable = () => {
    if (type === 'currency' && typeof value === 'number') return format.money(value, data.currency);
    if (type === 'number' && typeof value === 'number') return format.number(value);
    if (type === 'date' && typeof value === 'string') return format.date(value, 'long');
    return String(value);
  };

  const common = {
    className: 'document-field',
    'data-doc': 'field',
    'data-name': path,
    'data-value': value === null || value === undefined ? undefined : JSON.stringify(value),
    'data-type': type,
    'data-role': capture.role,
    'data-required': required ? 'true' : undefined,
    'data-label-visible': showLabel ? 'true' : undefined,
    style: areaStyle(area),
  } as const;

  if (!capture.editable) {
    return (
      <span {...common} data-state={empty ? (placeholder ? 'placeholder' : 'blank') : justFilled ? 'filled-now' : undefined} onAnimationEnd={() => setJustFilled(false)}>
        {showLabel ? <span className="document-field__label">{label}</span> : null}
        <span className="document-field__value">{empty ? (placeholder ?? '') : readable()}</span>
      </span>
    );
  }

  const input = INPUT[type];
  const shared = {
    id,
    className: 'document-field__input',
    name: path,
    required: required && !hidden,
    disabled: hidden,
    value: draft ?? editText(type, value, data.currency),
    onFocus: () => setDraft(editText(type, value, data.currency)),
    onBlur: () => setDraft(null),
  };
  return (
    <span {...common}>
      <label htmlFor={id} className={showLabel ? 'document-field__label' : 'visually-hidden'}>
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          {...shared}
          rows={3}
          onChange={(event) => {
            setDraft(event.target.value);
            set(stored(type, event.target.value, data.currency));
          }}
        />
      ) : (
        <input
          {...shared}
          type={input.type}
          inputMode={input.inputMode}
          pattern={pattern ?? input.pattern}
          autoComplete={input.autoComplete}
          onChange={(event) => {
            setDraft(event.target.value);
            set(stored(type, event.target.value, data.currency));
          }}
        />
      )}
    </span>
  );
}
