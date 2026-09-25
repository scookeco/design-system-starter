import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Spinner.css';

export type SpinnerSize = 'sm' | 'md';

export interface SpinnerProps extends EscapeHatch {
  size?: SpinnerSize;
  /**
   * Standalone use: what is loading ("Loading records"). Renders a status region that
   * announces it. Omit inside a control that already has a name (Button does): the
   * spinner is then decorative.
   */
  label?: string;
}

/** Indeterminate progress for short or briefly unpredictable waits. Longer, shaped waits get a Skeleton. */
export function Spinner({ size = 'sm', label, UNSAFE_className, UNSAFE_style }: SpinnerProps) {
  if (!label) {
    return <span className={cx('spinner', UNSAFE_className)} style={UNSAFE_style} data-size={size} aria-hidden="true" />;
  }
  return (
    <span className={cx('spinner-status', UNSAFE_className)} style={UNSAFE_style} role="status">
      <span className="spinner" data-size={size} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
