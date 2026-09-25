import { useId } from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Checkbox.css';

export type CheckedState = boolean | 'indeterminate';

export interface CheckboxProps extends EscapeHatch {
  /** Visible label and accessible name. Required. */
  label: string;
  description?: string;
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
}

export function Checkbox({ label, description, UNSAFE_className, UNSAFE_style, ...rootProps }: CheckboxProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className={cx('checkbox', UNSAFE_className)} style={UNSAFE_style}>
      <CheckboxPrimitive.Root {...rootProps} id={id} className="checkbox__box" aria-describedby={descriptionId}>
        <CheckboxPrimitive.Indicator className="checkbox__indicator">
          {rootProps.checked === 'indeterminate' ? <Icon name="minus" /> : <Icon name="check" />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <div className="checkbox__text">
        <label className="checkbox__label" htmlFor={id}>
          {label}
        </label>
        {description ? (
          <p className="checkbox__description" id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
