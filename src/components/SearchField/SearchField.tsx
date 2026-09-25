import { useId, useRef, type ComponentPropsWithRef, type KeyboardEvent } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Field, fieldIds } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import './SearchField.css';

export type SearchFieldProps = Closed<Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'value' | 'defaultValue' | 'onChange'>> & {
  /** Visible label and accessible name ("Search records"). Required; hideLabel when the page makes it obvious. */
  label: string;
  hideLabel?: boolean;
  description?: string;
  /** The query. Controlled: results follow it as it changes. */
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name of the clear button. */
  clearLabel?: string;
  /** Id of the input. Generated when omitted. */
  id?: string;
};

/**
 * A search input: type="search", a search icon, and a clear button once there is a query. Clearing
 * (button or Escape) empties it and keeps focus in the field.
 */
export function SearchField({
  label,
  hideLabel,
  description,
  value,
  onValueChange,
  clearLabel = 'Clear search',
  id,
  onKeyDown,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: SearchFieldProps) {
  const ids = fieldIds(useId(), description, undefined, id);
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onValueChange('');
    inputRef.current?.focus();
  };

  const clearOnEscape = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.key === 'Escape' && value !== '') {
      event.preventDefault();
      clear();
    }
  };

  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} description={description}>
      <div className={cx('search-field field__control', UNSAFE_className)} style={UNSAFE_style}>
        <Icon name="search" />
        <input
          {...rest}
          ref={inputRef}
          type="search"
          id={ids.controlId}
          className="search-field__input"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={clearOnEscape}
          aria-describedby={ids.describedBy}
        />
        {value !== '' ? (
          <button type="button" className="search-field__clear" aria-label={clearLabel} onClick={clear}>
            <Icon name="close" />
          </button>
        ) : null}
      </div>
    </Field>
  );
}
