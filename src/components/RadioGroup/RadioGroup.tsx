import { useId } from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Field, fieldIds } from '../Field/Field';
import './RadioGroup.css';

export interface RadioOption {
  value: string;
  label: string;
  /** One line under the option's label. */
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends EscapeHatch {
  /** The question the options answer. Names the group. Required. */
  label: string;
  hideLabel?: boolean;
  options: readonly RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  description?: string;
  /** Error message for the group. Sets aria-invalid on the group. */
  error?: string;
  disabled?: boolean;
  name?: string;
  orientation?: 'vertical' | 'horizontal';
  /** Id of the first option, for an error summary link. Generated when omitted. */
  id?: string;
}

/**
 * One choice from a few visible options (up to about five; more is a Select).
 * Arrow keys move and select, Tab leaves the group: behaviour from Radix RadioGroup.
 */
export function RadioGroup({
  label,
  hideLabel,
  options,
  description,
  error,
  orientation = 'vertical',
  id,
  UNSAFE_className,
  UNSAFE_style,
  ...rootProps
}: RadioGroupProps) {
  const ids = fieldIds(useId(), description, error, id);
  return (
    <Field ids={ids} label={label} hideLabel={hideLabel} description={description} error={error} nativeLabel={false}>
      <RadioGroupPrimitive.Root
        {...rootProps}
        orientation={orientation}
        className={cx('radio-group', UNSAFE_className)}
        style={UNSAFE_style}
        aria-labelledby={ids.labelId}
        aria-describedby={ids.describedBy}
        aria-invalid={ids.invalid || undefined}
      >
        {options.map((option, index) => {
          const itemId = index === 0 ? ids.controlId : `${ids.controlId}-${String(index)}`;
          const descriptionId = option.description ? `${itemId}-description` : undefined;
          return (
            <div className="radio" key={option.value}>
              <RadioGroupPrimitive.Item
                id={itemId}
                className="radio__control"
                value={option.value}
                disabled={option.disabled}
                aria-describedby={descriptionId}
              >
                <RadioGroupPrimitive.Indicator className="radio__indicator" />
              </RadioGroupPrimitive.Item>
              <div className="radio__text">
                <label className="radio__label" htmlFor={itemId}>
                  {option.label}
                </label>
                {option.description ? (
                  <p className="radio__description" id={descriptionId}>
                    {option.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>
    </Field>
  );
}
