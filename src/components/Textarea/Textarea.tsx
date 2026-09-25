import { useId, type ComponentPropsWithRef } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Field, fieldIds } from '../Field/Field';

export type TextareaProps = Closed<ComponentPropsWithRef<'textarea'>> & {
  /** Visible label and accessible name. Required. */
  label: string;
  hideLabel?: boolean;
  /** Supporting text, linked with aria-describedby. */
  description?: string;
  /** Error message. Sets aria-invalid and is announced with the field. */
  error?: string;
  /** Id of the textarea, for an error summary link. Generated when omitted. */
  id?: string;
};

/** Multi-line text. Same anatomy and states as TextField; Enter inserts a newline, it never submits. */
export function Textarea({ label, hideLabel, description, error, id, rows = 4, UNSAFE_className, UNSAFE_style, ...rest }: TextareaProps) {
  const ids = fieldIds(useId(), description, error, id);
  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} description={description} error={error}>
      <textarea
        {...rest}
        rows={rows}
        id={ids.controlId}
        className={cx('field__control', UNSAFE_className)}
        style={UNSAFE_style}
        data-multiline="true"
        aria-describedby={ids.describedBy}
        aria-invalid={ids.invalid || undefined}
      />
    </Field>
  );
}
