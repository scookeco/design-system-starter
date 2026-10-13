import { useId, type ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { useCapture, useField } from '../Document/data';
import { ChoiceContext } from '../DocumentRadioGroup/DocumentRadioGroup';
import '../DocumentField/DocumentField.css';

export interface DocumentSelectProps {
  /** The data key (the chosen option's value). Required. */
  name: string;
  /** What is chosen ("State"). Required. */
  label: string;
  /** Show the label above it, as a form's box does. Default: named for assistive technology only. */
  showLabel?: boolean;
  /** The party who chooses. Default: the enclosing fieldset's or role region's. */
  role?: string;
  required?: boolean;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** One DocumentOption per choice. Required. */
  children: ReactNode;
}

/** A choice from a list in a document: a native select while editable, the chosen option's words otherwise. */
export function DocumentSelect({ name, label, showLabel = false, role, required = false, area, children }: DocumentSelectProps) {
  const { path, value, set } = useField(name);
  const capture = useCapture(role);
  const hidden = capture.hidden;
  const id = useId();
  const common = {
    className: 'document-field',
    'data-doc': 'select',
    'data-name': path,
    'data-value': value === null || value === undefined ? undefined : JSON.stringify(value),
    'data-role': capture.role,
    'data-required': required ? 'true' : undefined,
    'data-label-visible': showLabel ? 'true' : undefined,
    style: areaStyle(area),
  } as const;
  const choice = { kind: 'select' as const, path, value, set, required: required && !hidden, disabled: hidden || !capture.editable };
  if (!capture.editable) {
    // The chosen option's words, read from the options themselves.
    return (
      <span {...common} data-state={value ? undefined : 'blank'}>
        {showLabel ? <span className="document-field__label">{label}</span> : null}
        <span className="document-field__value">
          <SelectedLabel value={value} options={children} />
        </span>
      </span>
    );
  }
  return (
    <span {...common}>
      <label htmlFor={id} className={showLabel ? 'document-field__label' : 'visually-hidden'}>
        {label}
      </label>
      <select id={id} className="document-field__input" name={path} required={choice.required} disabled={choice.disabled} value={String(value ?? '')} onChange={(event) => set(event.target.value)}>
        <option value="">Choose…</option>
        <ChoiceContext value={choice}>{children}</ChoiceContext>
      </select>
    </span>
  );
}

/** The chosen option's text, from the DocumentOption children. */
function SelectedLabel({ value, options }: { value: unknown; options: ReactNode }) {
  const list = (Array.isArray(options) ? options : [options]) as { props?: { value?: string; children?: string } }[];
  return <>{list.find((o) => o.props?.value === value)?.props?.children ?? ''}</>;
}
