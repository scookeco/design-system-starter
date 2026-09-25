import { useEffect, useId, useRef, useState, type ComponentPropsWithRef, type Ref } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Field, fieldIds } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import './TextField.css';

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
  /** "password" adds a show-password toggle (WCAG 2.2 SC 3.3.8). Pair it with autoComplete="current-password" or "new-password". */
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
  /** type="password" only: accessible name of the show-password toggle. It reports its state with aria-pressed. */
  showPasswordLabel?: string;
  /** type="password" only: start with the password shown (gallery and tests). */
  defaultPasswordVisible?: boolean;
};

const setRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
};

export function TextField({
  label,
  hideLabel,
  description,
  error,
  size = 'md',
  type = 'text',
  id,
  showPasswordLabel = 'Show password',
  defaultPasswordVisible = false,
  ref,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: TextFieldProps) {
  const ids = fieldIds(useId(), description, error, id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [passwordVisible, setPasswordVisible] = useState(defaultPasswordVisible);
  const isPassword = type === 'password';

  // Hide the password again on submit, so the browser never records it as plain text.
  useEffect(() => {
    const form = isPassword ? inputRef.current?.form : null;
    if (!form) return undefined;
    const hide = () => setPasswordVisible(false);
    form.addEventListener('submit', hide);
    return () => form.removeEventListener('submit', hide);
  }, [isPassword]);

  const input = (className: string, style?: typeof UNSAFE_style) => (
    <input
      {...rest}
      ref={(node) => {
        inputRef.current = node;
        setRef(ref, node);
      }}
      type={isPassword && passwordVisible ? 'text' : type}
      id={ids.controlId}
      className={className}
      style={style}
      data-size={size}
      aria-describedby={ids.describedBy}
      aria-invalid={ids.invalid || undefined}
    />
  );

  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} description={description} error={error}>
      {isPassword ? (
        <div className={cx('text-field field__control', UNSAFE_className)} style={UNSAFE_style} data-size={size}>
          {input('text-field__input')}
          <button
            type="button"
            className="text-field__reveal"
            aria-label={showPasswordLabel}
            aria-pressed={passwordVisible}
            aria-controls={ids.controlId}
            disabled={rest.disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            <Icon name={passwordVisible ? 'eye-off' : 'eye'} />
          </button>
        </div>
      ) : (
        input(cx('field__control', UNSAFE_className), UNSAFE_style)
      )}
    </Field>
  );
}
