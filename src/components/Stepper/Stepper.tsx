import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Stepper.css';

export interface StepperStep {
  /** Short, parallel noun or verb phrase: "Workspace", "Invite", "Plan", "Review". */
  label: string;
}

export interface StepperProps extends EscapeHatch {
  /** Accessible name of the list ("Setup steps"). Required. */
  label: string;
  steps: readonly StepperStep[];
  /** Index (from 0) of the step being done now. Earlier steps are completed, later ones upcoming. */
  current: number;
  /** Visually hidden prefix read before a completed step's label. */
  completedLabel?: string;
}

type StepState = 'completed' | 'current' | 'upcoming';

/**
 * Where someone is in an ordered task. An ordered list: completed steps show a check and a hidden
 * "Completed" prefix, the current one has aria-current="step" and a heavier mark, upcoming ones
 * their number. State is never carried by colour alone. Not navigation: steps are not links.
 */
export function Stepper({ label, steps, current, completedLabel = 'Completed', UNSAFE_className, UNSAFE_style }: StepperProps) {
  return (
    <ol aria-label={label} className={cx('stepper', UNSAFE_className)} style={UNSAFE_style} role="list">
      {steps.map((step, index) => {
        const state: StepState = index < current ? 'completed' : index === current ? 'current' : 'upcoming';
        return (
          <li key={step.label} className="stepper__step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="stepper__marker" aria-hidden="true">
              {state === 'completed' ? <Icon name="check" /> : index + 1}
            </span>
            <span className="stepper__label">
              {state === 'completed' ? <span className="visually-hidden">{`${completedLabel}: `}</span> : null}
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
