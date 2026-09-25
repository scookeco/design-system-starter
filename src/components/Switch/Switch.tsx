import { useId } from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Switch.css';

export interface SwitchProps extends EscapeHatch {
  /** Visible label and accessible name: the setting, not the state ("Email me a weekly digest"). Required. */
  label: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
  /** Id of the switch, for an error summary link. Generated when omitted. */
  id?: string;
}

/**
 * An on/off setting that takes effect as a setting, not a form answer (use Checkbox for those).
 * State shows as thumb position and fill, never colour alone. Behaviour from Radix Switch.
 */
export function Switch({ label, description, id, UNSAFE_className, UNSAFE_style, ...rootProps }: SwitchProps) {
  const baseId = useId();
  const controlId = id ?? `${baseId}-control`;
  const descriptionId = description ? `${baseId}-description` : undefined;
  return (
    <div className={cx('switch', UNSAFE_className)} style={UNSAFE_style}>
      <div className="switch__text">
        <label className="switch__label" htmlFor={controlId}>
          {label}
        </label>
        {description ? (
          <p className="switch__description" id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
      <SwitchPrimitive.Root {...rootProps} id={controlId} className="switch__track" aria-describedby={descriptionId}>
        <SwitchPrimitive.Thumb className="switch__thumb" />
      </SwitchPrimitive.Root>
    </div>
  );
}
