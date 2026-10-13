import { areaStyle, type DocumentArea } from '../Document/Document';
import { useCapture, useField } from '../Document/data';
import './DocumentCheckbox.css';

export interface DocumentCheckboxProps {
  /** The data key (true when checked). Required. */
  name: string;
  /** What checking it says ("I hold more than one job"), beside the box. Required. */
  label: string;
  /** The party who checks it. Default: the enclosing fieldset's or role region's. */
  role?: string;
  required?: boolean;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/**
 * A box to check in a document, with its label beside it. Editable while the Document is filled
 * or negotiated; otherwise it shows its state, checked or not, as the printed form does.
 */
export function DocumentCheckbox({ name, label, role, required = false, area }: DocumentCheckboxProps) {
  const { path, value, set } = useField(name);
  const capture = useCapture(role);
  const hidden = capture.hidden;
  return (
    <label
      className="document-checkbox"
      data-doc="checkbox"
      data-name={path}
      data-role={capture.role}
      data-required={required ? 'true' : undefined}
      style={areaStyle(area)}
    >
      <input
        type="checkbox"
        className="document-checkbox__box"
        name={path}
        checked={value === true}
        required={required && !hidden}
        disabled={hidden || !capture.editable}
        onChange={(event) => set(event.target.checked)}
      />
      {label}
    </label>
  );
}
