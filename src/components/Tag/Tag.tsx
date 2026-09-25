import type { Ref } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Tag.css';

export interface TagProps extends EscapeHatch {
  /** The value it stands for ("Status: Overdue"). Required. */
  children: string;
  /** Shows a remove button. The caller removes the tag and moves focus (to the next tag, or the control that adds them). */
  onRemove?: () => void;
  /** Accessible name of the remove button. Defaults to "Remove <children>". */
  removeLabel?: string;
  /** Ref to the remove button, for moving focus between tags. */
  removeRef?: Ref<HTMLButtonElement>;
}

/** A compact value: an active filter chip, a label on a record. Removable when onRemove is set. */
export function Tag({ children, onRemove, removeLabel, removeRef, UNSAFE_className, UNSAFE_style }: TagProps) {
  return (
    <span className={cx('tag', UNSAFE_className)} style={UNSAFE_style} data-removable={onRemove ? 'true' : undefined}>
      <span className="tag__label">{children}</span>
      {onRemove ? (
        <button type="button" className="tag__remove" aria-label={removeLabel ?? `Remove ${children}`} onClick={onRemove} ref={removeRef}>
          <Icon name="close" />
        </button>
      ) : null}
    </span>
  );
}
