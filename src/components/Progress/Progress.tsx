import { useId } from 'react';
import { Progress as ProgressPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Progress.css';

export interface ProgressProps extends EscapeHatch {
  /** Visible label and accessible name ("Setup progress", "Uploading contract.pdf"). Required. */
  label: string;
  /** Current value, from 0 to max. */
  value: number;
  max?: number;
  /**
   * The value in words, shown beside the label and used as aria-valuetext ("Step 2 of 4",
   * "3 of 12 files"). Defaults to a whole percentage.
   */
  valueText?: string;
}

/**
 * Determinate progress through a task: a bar with a label and the value in words. For work of
 * unknown length use Spinner; for usage against a limit use Meter.
 */
export function Progress({ label, value, max = 100, valueText, UNSAFE_className, UNSAFE_style }: ProgressProps) {
  const labelId = useId();
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? Math.round((clamped / max) * 100) : 0;
  const text = valueText ?? `${String(percent)}%`;
  return (
    <div className={cx('progress', UNSAFE_className)} style={UNSAFE_style}>
      <div className="progress__header">
        <span className="progress__label" id={labelId}>
          {label}
        </span>
        <span className="progress__value" aria-hidden="true">
          {text}
        </span>
      </div>
      <ProgressPrimitive.Root className="progress__track" value={clamped} max={max} aria-labelledby={labelId} getValueLabel={() => text}>
        {/* The fill's width is data (how far along), not a design value. */}
        <ProgressPrimitive.Indicator className="progress__indicator" style={{ inlineSize: `${String(percent)}%` }} />
      </ProgressPrimitive.Root>
    </div>
  );
}
