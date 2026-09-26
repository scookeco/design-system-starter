import { Button, Group, Input, NumberField as AriaNumberField } from 'react-aria-components';
import { currencyDigits } from '../../format';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import { PickerHelp, PickerLabel, PickerLocale } from '../Picker/Picker';
import './NumberField.css';

export interface NumberFieldProps extends EscapeHatch {
  /** Visible label and accessible name. Required. */
  label: string;
  hideLabel?: boolean;
  /**
   * The number. With `currency`, integer minor units (cents), like every amount in the system:
   * 125050 with "USD" shows $1,250.50. null is empty.
   */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  /** How it reads: a plain number, a percentage (0.25 shows 25%), or money when `currency` is set. */
  format?: 'number' | 'percent';
  /** ISO 4217 code: the field shows and parses money, and `value` is in minor units. */
  currency?: string;
  min?: number;
  max?: number;
  /**
   * Arrow keys and the stepper buttons move by this (in the value's units), and the value snaps to
   * its multiples: leave it unset for money unless only whole units are allowed.
   */
  step?: number;
  maximumFractionDigits?: number;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  name?: string;
  /** Hide the − and + buttons (arrow keys still step). */
  hideStepper?: boolean;
  incrementLabel?: string;
  decrementLabel?: string;
}

/**
 * A number typed in the reader's own format ("1.234,5" in German), parsed back to a number:
 * amounts, quantities, percentages. ↑ ↓ step, Page Up/Down step by ten, Home/End go to min/max.
 * Built on React Aria's NumberField (not a native number input, which takes "e", ignores the
 * locale's grouping and changes on scroll). Formatting follows LocaleProvider, like useFormat().
 */
export function NumberField({
  label,
  hideLabel,
  value,
  defaultValue,
  onValueChange,
  format = 'number',
  currency,
  min,
  max,
  step,
  maximumFractionDigits,
  description,
  error,
  size = 'md',
  disabled,
  required,
  name,
  hideStepper = false,
  incrementLabel = 'Increase',
  decrementLabel = 'Decrease',
  UNSAFE_className,
  UNSAFE_style,
}: NumberFieldProps) {
  // Money travels as integer minor units; the field edits major units.
  const scale = currency ? 10 ** currencyDigits(currency) : 1;
  const toField = (n: number | null | undefined) => (n === null || n === undefined ? Number.NaN : n / scale);
  const formatOptions: Intl.NumberFormatOptions = currency
    ? { style: 'currency', currency, ...(maximumFractionDigits === undefined ? {} : { maximumFractionDigits }) }
    : { style: format === 'percent' ? 'percent' : 'decimal', ...(maximumFractionDigits === undefined ? {} : { maximumFractionDigits }) };
  return (
    <PickerLocale>
      <AriaNumberField
        className={cx('field', 'number-field', UNSAFE_className)}
        {...(UNSAFE_style ? { style: UNSAFE_style } : {})}
        {...(value !== undefined ? { value: toField(value) } : {})}
        {...(defaultValue !== undefined ? { defaultValue: toField(defaultValue) } : {})}
        onChange={(n) => onValueChange?.(Number.isNaN(n) ? null : currency ? Math.round(n * scale) : n)}
        formatOptions={formatOptions}
        {...(min === undefined ? {} : { minValue: min / scale })}
        {...(max === undefined ? {} : { maxValue: max / scale })}
        {...(step === undefined ? {} : { step: step / scale })}
        isDisabled={disabled}
        isRequired={required}
        isInvalid={Boolean(error)}
        name={name}
      >
        <PickerLabel label={label} hideLabel={hideLabel} />
        <Group className="field__control picker__control number-field__control" data-size={size} data-invalid={error ? true : undefined} data-disabled={disabled || undefined}>
          <Input className="picker__input number-field__input" />
          {hideStepper ? null : (
            <>
              <Button slot="decrement" className="picker__button" aria-label={decrementLabel}>
                <Icon name="minus" />
              </Button>
              <Button slot="increment" className="picker__button" aria-label={incrementLabel}>
                <Icon name="plus" />
              </Button>
            </>
          )}
        </Group>
        <PickerHelp description={description} error={error} />
      </AriaNumberField>
    </PickerLocale>
  );
}
