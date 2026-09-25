import { useId } from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Field, fieldIds } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends EscapeHatch {
  /** Visible label and accessible name of the trigger. Required. */
  label: string;
  hideLabel?: boolean;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  /** Form field name; a hidden native select carries the value in forms. */
  name?: string;
  /** Render the list open (gallery and tests). */
  defaultOpen?: boolean;
  /** Id of the trigger, for an error summary link. Generated when omitted. */
  id?: string;
}

/** Single-choice list. Behaviour (keyboard, typeahead, focus, ARIA) comes from Radix Select. */
export function Select({
  label,
  hideLabel,
  options,
  placeholder = 'Select…',
  description,
  error,
  size = 'md',
  id,
  UNSAFE_className,
  UNSAFE_style,
  ...rootProps
}: SelectProps) {
  const ids = fieldIds(useId(), description, error, id);
  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} description={description} error={error}>
      <SelectPrimitive.Root {...rootProps}>
        <SelectPrimitive.Trigger
          id={ids.controlId}
          className={cx('field__control', 'select__trigger', UNSAFE_className)}
          style={UNSAFE_style}
          data-size={size}
          aria-labelledby={ids.labelId}
          aria-describedby={ids.describedBy}
          aria-invalid={ids.invalid || undefined}
        >
          <span className="select__value">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon className="select__chevron">
            <Icon name="chevron-down" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="select__content" position="popper" sideOffset={4}>
            <SelectPrimitive.Viewport className="select__viewport">
              {options.map((option) => (
                <SelectPrimitive.Item key={option.value} value={option.value} disabled={option.disabled} className="select__item">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="select__indicator">
                    <Icon name="check" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </Field>
  );
}
