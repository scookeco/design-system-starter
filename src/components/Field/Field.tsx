import type { ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import './Field.css';

/** Ids a control needs to wire itself to its label and supporting text. */
export interface FieldIds {
  controlId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

export interface FieldProps {
  ids: FieldIds;
  label: string;
  hideLabel?: boolean;
  description?: string | undefined;
  error?: string | undefined;
  /** Render the label as a <label for>. Set false for controls that are not labelable elements. */
  nativeLabel?: boolean;
  children: ReactNode;
}

/** Builds the id set for a field from one base id. */
export const fieldIds = (baseId: string, description?: string, error?: string): FieldIds => {
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;
  const describedBy = [description ? descriptionId : '', error ? errorId : ''].filter(Boolean).join(' ');
  return {
    controlId: `${baseId}-control`,
    labelId: `${baseId}-label`,
    descriptionId,
    errorId,
    describedBy: describedBy || undefined,
    invalid: Boolean(error),
  };
};

/**
 * Internal: label, control, description and error in a fixed anatomy, shared by
 * TextField and Select so every form control has the same structure and spacing.
 */
export function Field({ ids, label, hideLabel = false, description, error, nativeLabel = true, children }: FieldProps) {
  const labelClass = hideLabel ? 'field__label visually-hidden' : 'field__label';
  return (
    <div className="field">
      {nativeLabel ? (
        <label className={labelClass} id={ids.labelId} htmlFor={ids.controlId}>
          {label}
        </label>
      ) : (
        <span className={labelClass} id={ids.labelId}>
          {label}
        </span>
      )}
      {children}
      {description ? (
        <p className="field__description" id={ids.descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={ids.errorId}>
          <Icon name="danger" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
