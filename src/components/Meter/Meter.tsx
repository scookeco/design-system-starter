import { useId } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Meter.css';

export type MeterStatus = 'ok' | 'warning' | 'danger';

export interface MeterProps extends EscapeHatch {
  /** What is measured ("Seats", "Storage"). Visible; names the meter. Required. */
  label: string;
  value: number;
  /** The limit. */
  max: number;
  /** Usage in words, shown and read out ("42 of 50 seats"). Defaults to "value of max". */
  valueText?: string;
  /** From this value on the meter warns. Defaults to 80% of max. */
  warningAt?: number;
  /** From this value on the meter is in danger. Defaults to max (the limit is reached). */
  dangerAt?: number;
  /** Words for each status beyond ok, shown with an icon and appended to the value text. */
  statusLabels?: Record<Exclude<MeterStatus, 'ok'>, string>;
}

const STATUS_LABELS = { warning: 'Nearing limit', danger: 'Limit reached' };

/** How much of a limit is used: seats, storage, API calls. Past a threshold it warns in words and an icon, not colour alone. */
export function Meter({
  label,
  value,
  max,
  valueText,
  warningAt = max * 0.8,
  dangerAt = max,
  statusLabels = STATUS_LABELS,
  UNSAFE_className,
  UNSAFE_style,
}: MeterProps) {
  const labelId = useId();
  const status: MeterStatus = value >= dangerAt ? 'danger' : value >= warningAt ? 'warning' : 'ok';
  const percent = max > 0 ? Math.min(100, Math.round((Math.max(value, 0) / max) * 100)) : 0;
  const text = valueText ?? `${String(value)} of ${String(max)}`;
  const statusText = status === 'ok' ? undefined : statusLabels[status];
  return (
    <div className={cx('meter', UNSAFE_className)} style={UNSAFE_style} data-status={status}>
      <div className="meter__header">
        <span className="meter__label" id={labelId}>
          {label}
        </span>
        <span className="meter__value" aria-hidden="true">
          {text}
        </span>
      </div>
      <div
        className="meter__track"
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={statusText ? `${text}, ${statusText}` : text}
      >
        {/* The fill's width is data (how much is used), not a design value. */}
        <div className="meter__fill" style={{ inlineSize: `${String(percent)}%` }} />
      </div>
      {statusText ? (
        <p className="meter__status" aria-hidden="true">
          <Icon name={status === 'danger' ? 'danger' : 'warning'} />
          {statusText}
        </p>
      ) : null}
    </div>
  );
}
