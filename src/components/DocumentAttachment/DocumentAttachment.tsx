import { useId } from 'react';
import { useFormat } from '../../format/LocaleProvider';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { useCapture, useField } from '../Document/data';
import '../DocumentField/DocumentField.css';
import './DocumentAttachment.css';

export interface DocumentAttachmentProps {
  /** The data key: the attached files' names. Required. */
  name: string;
  /** What to attach ("Proof of address"). Required. */
  label: string;
  /** The file types accepted (".pdf,image/*"). */
  accept?: string;
  /** More than one file. */
  multiple?: boolean;
  /** The party who attaches it. Default: the enclosing fieldset's or role region's. */
  role?: string;
  required?: boolean;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/**
 * A supporting file attached to a document (a signer attachment): a native file input while
 * editable, the attached files' names otherwise. Stores names only; the app keeps the files.
 */
export function DocumentAttachment({ name, label, accept, multiple = false, role, required = false, area }: DocumentAttachmentProps) {
  const { path, value, set } = useField(name);
  const format = useFormat();
  const capture = useCapture(role);
  const hidden = capture.hidden;
  const id = useId();
  const names = Array.isArray(value) ? (value as string[]) : [];
  return (
    <span
      className="document-field"
      data-doc="attachment"
      data-name={path}
      data-value={value === null || value === undefined ? undefined : JSON.stringify(value)}
      data-role={capture.role}
      data-required={required ? 'true' : undefined}
      data-label-visible="true"
      data-state={!capture.editable && !names.length ? 'blank' : undefined}
      style={areaStyle(area)}
    >
      <label htmlFor={id} className="document-field__label">
        {label}
      </label>
      {capture.editable ? (
        <input
          id={id}
          type="file"
          className="document-field__input document-attachment__input"
          name={path}
          accept={accept}
          multiple={multiple}
          required={required && !hidden && !names.length}
          disabled={hidden}
          onChange={(event) => set([...(event.target.files ?? [])].map((file) => file.name))}
        />
      ) : (
        <span id={id} className="document-field__value">
          {format.list(names)}
        </span>
      )}
    </span>
  );
}
