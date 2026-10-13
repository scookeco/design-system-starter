import { createContext, useContext, useId, type ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { useCapture, useField } from '../Document/data';
import './DocumentRadioGroup.css';

interface Choice {
  kind: 'radio' | 'select';
  path: string;
  value: unknown;
  set: (value: string) => void;
  required: boolean;
  disabled: boolean;
}

/** The group an option belongs to: radios in a DocumentRadioGroup, options in a DocumentSelect. */
export const ChoiceContext = createContext<Choice | null>(null);

export interface DocumentRadioGroupProps {
  /** The data key (the chosen option's value). Required. */
  name: string;
  /** The question the options answer ("Filing status"). Required. */
  label: string;
  /** The party who chooses. Default: the enclosing fieldset's or role region's. */
  role?: string;
  required?: boolean;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** One DocumentOption per choice. Required. */
  children: ReactNode;
}

/** One choice of several in a document (a W-4's filing status), each a radio with its label. */
export function DocumentRadioGroup({ name, label, role, required = false, area, children }: DocumentRadioGroupProps) {
  const { path, value, set } = useField(name);
  const capture = useCapture(role);
  const hidden = capture.hidden;
  return (
    <fieldset
      className="document-radio-group"
      data-doc="radio-group"
      data-name={path}
      data-value={value === null || value === undefined ? undefined : JSON.stringify(value)}
      data-role={capture.role}
      data-required={required ? 'true' : undefined}
      style={areaStyle(area)}
    >
      <legend className="document-radio-group__legend">{label}</legend>
      <ChoiceContext value={{ kind: 'radio', path, value, set, required: required && !hidden, disabled: hidden || !capture.editable }}>{children}</ChoiceContext>
    </fieldset>
  );
}

export interface DocumentOptionProps {
  /** What is stored when it is chosen ("single"). Required. */
  value: string;
  /** What it says ("Single or Married filing separately"). Required. */
  children: string;
}

/** One choice in a DocumentRadioGroup (a radio and its label) or a DocumentSelect (an option). */
export function DocumentOption({ value, children }: DocumentOptionProps) {
  const choice = useContext(ChoiceContext);
  const id = useId();
  if (choice?.kind === 'select') return <option value={value}>{children}</option>;
  return (
    <label className="document-radio-group__option" htmlFor={id}>
      <input
        id={id}
        type="radio"
        className="document-radio-group__radio"
        name={choice?.path}
        value={value}
        checked={choice?.value === value}
        required={choice?.required}
        disabled={choice?.disabled ?? true}
        onChange={() => choice?.set(value)}
      />
      {children}
    </label>
  );
}
