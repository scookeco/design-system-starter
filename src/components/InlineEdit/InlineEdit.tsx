import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import '../Field/Field.css';
import './InlineEdit.css';

export interface InlineEditProps extends EscapeHatch {
  /** What the value is ("Name"). The field's label and the edit button's name ("Edit Name"). Required. */
  label: string;
  value: string;
  /**
   * Save the new value. Return (or resolve to) an error message string to stay in edit mode with
   * it; anything else means saved. While a returned promise is pending, Save shows its pending
   * state; a rejected promise keeps edit mode with `failedMessage`.
   */
  onSave: (value: string) => unknown;
  /** Check before saving: a message when the value can't be saved. */
  validate?: (value: string) => string | undefined;
  /** Shown in view mode when the value is empty. */
  placeholder?: string;
  /** View only, with the reason as the edit button's description (no permission, archived…). */
  disabledReason?: string;
  /** Accessible names of the actions. */
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  /** Shown when `onSave` throws or rejects. */
  failedMessage?: string;
  /** Start in edit mode (gallery and tests). */
  defaultEditing?: boolean;
  /** Start in edit mode with this draft and its error (gallery and tests). */
  defaultDraft?: string;
}

/**
 * A value you can change where it's shown: view → edit → save or cancel. Enter saves, Escape
 * cancels, and focus returns to the value either way. Validation and the server's answer show
 * under the field without losing what was typed. For one value at a time (a name, a title);
 * a form with several fields is a form.
 */
export function InlineEdit({
  label,
  value,
  onSave,
  validate,
  placeholder = 'Empty',
  disabledReason,
  editLabel = `Edit ${label}`,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  failedMessage = 'Couldn’t save. Try again.',
  defaultEditing = false,
  defaultDraft,
  UNSAFE_className,
  UNSAFE_style,
}: InlineEditProps) {
  const id = useId();
  const [editing, setEditing] = useState(defaultEditing || defaultDraft !== undefined);
  const [draft, setDraft] = useState(defaultDraft ?? value);
  const [error, setError] = useState<string | undefined>(() => (defaultDraft === undefined ? undefined : validate?.(defaultDraft)));
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const view = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (editing) input.current?.focus();
    else if (returnFocus.current) view.current?.focus();
    returnFocus.current = false;
  }, [editing]);

  const start = () => {
    setDraft(value);
    setError(undefined);
    setEditing(true);
  };
  const stop = () => {
    returnFocus.current = true;
    setEditing(false);
    setError(undefined);
  };

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pending) return;
    const next = draft.trim();
    if (next === value) return stop();
    const invalid = validate?.(next);
    if (invalid) {
      setError(invalid);
      input.current?.focus();
      return;
    }
    setPending(true);
    try {
      const result: unknown = await onSave(next);
      if (typeof result === 'string') {
        setError(result);
        input.current?.focus();
      } else stop();
    } catch {
      setError(failedMessage);
      input.current?.focus();
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Only this edit: a dialog around it stays open.
      event.preventDefault();
      event.stopPropagation();
      stop();
    }
  };

  if (!editing) {
    return (
      <div className={cx('inline-edit', UNSAFE_className)} style={UNSAFE_style}>
        <button
          ref={view}
          type="button"
          className="inline-edit__view"
          aria-label={`${editLabel}: ${value || placeholder}`}
          aria-disabled={disabledReason ? true : undefined}
          aria-describedby={disabledReason ? `${id}-reason` : undefined}
          onClick={disabledReason ? undefined : start}
        >
          <span className="inline-edit__value" data-empty={value ? undefined : 'true'}>
            {value || placeholder}
          </span>
        </button>
        {disabledReason ? (
          <p className="inline-edit__message" id={`${id}-reason`}>
            {disabledReason}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form className={cx('inline-edit', UNSAFE_className)} style={UNSAFE_style} onSubmit={(event) => void save(event)} data-editing="true">
      <div className="inline-edit__row">
        <input
          ref={input}
          className="field__control inline-edit__input"
          data-size="sm"
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(undefined);
          }}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" size="sm" loading={pending}>
          {saveLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={stop} disabled={pending}>
          {cancelLabel}
        </Button>
      </div>
      {error ? (
        <p className="inline-edit__message" data-tone="danger" id={`${id}-error`}>
          <Icon name="danger" />
          <span>{error}</span>
        </p>
      ) : null}
    </form>
  );
}
