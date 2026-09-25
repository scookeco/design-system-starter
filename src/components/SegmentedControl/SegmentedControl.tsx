import { useId } from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './SegmentedControl.css';

export interface SegmentedOption {
  value: string;
  /** Short label: "7 days", "30 days". */
  label: string;
}

export interface SegmentedControlProps extends EscapeHatch {
  /** The question the options answer ("Date range"). Names the group. Required. */
  label: string;
  /** Hide the label visually when the options explain themselves; it stays the group's name. */
  hideLabel?: boolean;
  /** Two to five options. */
  options: readonly SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

/**
 * One value from a few, always exactly one, shown as joined segments: a date range, a view
 * density. Radio semantics (Radix RadioGroup): a named radiogroup of radios; Tab enters at the
 * checked one, arrow keys move and select.
 */
export function SegmentedControl({ label, hideLabel = false, options, UNSAFE_className, UNSAFE_style, ...rootProps }: SegmentedControlProps) {
  const labelId = useId();
  return (
    <div className={cx('segmented-control', UNSAFE_className)} style={UNSAFE_style}>
      <span className={hideLabel ? 'visually-hidden' : 'segmented-control__label'} id={labelId}>
        {label}
      </span>
      <RadioGroupPrimitive.Root {...rootProps} className="segmented-control__group" aria-labelledby={labelId} orientation="horizontal" loop>
        {options.map((option) => (
          <RadioGroupPrimitive.Item key={option.value} className="segmented-control__item" value={option.value}>
            {option.label}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
