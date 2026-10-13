import { useContext, useId } from 'react';
import { useFormat } from '../../format/LocaleProvider';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { HiddenContext, RoleContext, useField } from '../Document/data';
import '../DocumentField/DocumentField.css';

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
  const { data, path, value, set } = useField(name);
  const format = useFormat();
  const hidden = useContext(HiddenContext);
  const inherited = useContext(RoleContext);
  const id = useId();
  const names = Array.isArray(value) ? (value as string[]) : [];
  return (
    <span
      className="document-field"
      data-doc="attachment"
      data-name={path}
      data-role={role ?? inherited ?? undefined}
      data-required={required ? 'true' : undefined}
      data-label-visible="true"
      data-state={!data.editable && !names.length ? 'blank' : undefined}
      style={areaStyle(area)}
    >
      <label htmlFor={id} className="document-field__label">
        {label}
      </label>
      {data.editable ? (
        <input
          id={id}
          type="file"
          className="document-field__input"
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
