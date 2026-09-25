import { useId, type ComponentPropsWithRef } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Field, fieldIds } from '../Field/Field';

export type TextFieldProps = Closed<Omit<ComponentPropsWithRef<'input'>, 'size'>> & {
  /** Id of the input, for an error summary link. Generated when omitted. */
  id?: string;
  /** Visible label and accessible name. Required; use hideLabel only when context makes it obvious. */
  label: string;
  hideLabel?: boolean;
  /** Supporting text, linked with aria-describedby. */
  description?: string;
  /** Error message. Sets aria-invalid and is announced with the field. */
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
};

export function TextField({
  label,
  hideLabel,
  description,
  error,
  size = 'md',
  type = 'text',
  id,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: TextFieldProps) {
  const ids = fieldIds(useId(), description, error, id);
  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} description={description} error={error}>
      <input
        {...rest}
        type={type}
        id={ids.controlId}
        className={cx('field__control', UNSAFE_className)}
        style={UNSAFE_style}
        data-size={size}
        aria-describedby={ids.describedBy}
        aria-invalid={ids.invalid || undefined}
      />
    </Field>
  );
}
