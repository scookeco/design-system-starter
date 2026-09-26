import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { AiMarker } from '../AiMarker/AiMarker';
import { Button } from '../Button/Button';
import { Field, fieldIds } from '../Field/Field';
import { Kbd } from '../Kbd/Kbd';
import './Suggestion.css';

export interface SuggestionProps extends EscapeHatch {
  /** Visible label and accessible name. Required. */
  label: string;
  /** What the person has written. */
  value: string;
  onValueChange: (value: string) => void;
  /**
   * The AI's suggested continuation of `value`, shown as muted ghost text after it. It is never
   * part of the value until accepted. Undefined or empty: no suggestion.
   */
  suggestion?: string | undefined;
  /** The suggestion is still arriving: shown, but it can't be accepted until it's complete. */
  pending?: boolean;
  /** Tab (or Accept): the caller appends the suggestion to the value. */
  onAccept: () => void;
  /** Escape, Dismiss, or typing over it: the caller drops the suggestion. */
  onDismiss: () => void;
  /** Supporting text, linked with aria-describedby. */
  description?: string;
  error?: string;
  /** Visible rows before it grows. */
  rows?: number;
  /** Id of the text box, for an error summary link. Generated when omitted. */
  id?: string;
  disabled?: boolean;
}

/**
 * A multi-line text field that can show an inline AI suggestion as ghost text: Tab accepts it,
 * Escape dismisses it, and typing over it ignores it. The suggestion is marked as AI, is never the
 * field's value until accepted, and never moves the caret or focus. Screen readers hear "Suggestion
 * ready" once, politely, with the text and the keys; the field's value reads as what was typed.
 */
export function Suggestion({
  label,
  value,
  onValueChange,
  suggestion,
  pending = false,
  onAccept,
  onDismiss,
  description,
  error,
  rows = 4,
  id,
  disabled = false,
  UNSAFE_className,
  UNSAFE_style,
}: SuggestionProps) {
  const ids = fieldIds(useId(), description, error, id);
  const input = useRef<HTMLTextAreaElement>(null);
  const shown = suggestion !== undefined && suggestion !== '';
  const ready = shown && !pending;
  const hintId = `${ids.controlId}-suggestion`;
  const [announcement, setAnnouncement] = useState('');

  // Announce once, when a suggestion becomes complete. Never character by character.
  useEffect(() => {
    setAnnouncement(ready ? `Suggestion ready. Press Tab to accept or Escape to dismiss.` : '');
  }, [ready]);

  const accept = () => {
    onAccept();
    input.current?.focus();
  };
  const dismiss = () => {
    onDismiss();
    input.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!shown) return;
    if (event.key === 'Tab' && ready && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      onAccept();
    } else if (event.key === 'Escape') {
      // Only the suggestion: a dialog around the field stays open.
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    }
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(event.target.value);
    if (shown) onDismiss();
  };

  const describedBy = [ids.describedBy, shown ? hintId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <Field ids={ids} label={label} description={description} error={error}>
      <div className={cx('suggestion', UNSAFE_className)} style={UNSAFE_style} data-suggesting={shown || undefined} data-invalid={ids.invalid || undefined} data-disabled={disabled || undefined}>
        <div className="suggestion__mirror" aria-hidden="true">
          <span className="suggestion__typed">{value}</span>
          {shown ? <span className="suggestion__ghost">{suggestion}</span> : null}
        </div>
        <textarea
          ref={input}
          id={ids.controlId}
          className="suggestion__input field__control"
          rows={rows}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={ids.invalid || undefined}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </div>
      {shown ? (
        <div className="suggestion__bar">
          <span className="suggestion__hint" id={hintId}>
            <AiMarker variant="inline">{pending ? 'AI is suggesting…' : 'AI suggestion'}</AiMarker>
            <span className="visually-hidden">{`: ${suggestion ?? ''}.`}</span>
            <span className="suggestion__keys">
              <Kbd>Tab</Kbd> to accept · <Kbd>Esc</Kbd> to dismiss
            </span>
          </span>
          <span className="suggestion__actions">
            <Button variant="secondary" size="sm" disabled={!ready} onClick={accept}>
              Accept
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Dismiss
            </Button>
          </span>
        </div>
      ) : null}
      <span className="visually-hidden" role="status">
        {announcement}
      </span>
    </Field>
  );
}
