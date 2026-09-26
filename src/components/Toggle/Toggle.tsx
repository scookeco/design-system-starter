import { Toggle as TogglePrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import './Toggle.css';

export interface ToggleProps extends EscapeHatch {
  /** What it turns on ("Bold", "Show archived"). Constant: aria-pressed carries the state. Required. */
  label: string;
  /** Leading icon from the system set. */
  icon?: IconName;
  /** Icon only; the label becomes the accessible name. Needs an icon, and pair it with a Tooltip showing the label. */
  hideLabel?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/**
 * A button that stays pressed: a view option or formatting mode that applies immediately
 * (Bold, Show archived). aria-pressed carries the state; pressed also changes fill, border and
 * weight, never colour alone. For a setting use Switch; for one of several options use
 * SegmentedControl. Behaviour from Radix Toggle.
 */
export function Toggle({ label, icon, hideLabel = false, size = 'md', UNSAFE_className, UNSAFE_style, ...rootProps }: ToggleProps) {
  const iconOnly = hideLabel && icon !== undefined;
  return (
    <TogglePrimitive.Root
      {...rootProps}
      className={cx('toggle', UNSAFE_className)}
      style={UNSAFE_style}
      data-size={size}
      data-icon-only={iconOnly ? 'true' : undefined}
      aria-label={iconOnly ? label : undefined}
    >
      {icon ? <Icon name={icon} /> : null}
      {iconOnly ? null : <span className="toggle__label">{label}</span>}
    </TogglePrimitive.Root>
  );
}
