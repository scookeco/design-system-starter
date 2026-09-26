import { useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useFormat } from '../../format/LocaleProvider';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../Button/Button';
import { Kbd } from '../Kbd/Kbd';
import { Tag } from '../Tag/Tag';
import './Composer.css';

export interface ComposerAttachment {
  id: string;
  /** File name, shown on the chip and in its Remove button's name. */
  name: string;
}

export interface ComposerProps extends EscapeHatch {
  /** Accessible name of the text box ("Ask about this record"). Required; shown only to assistive technology. */
  label: string;
  placeholder?: string;
  /** Controlled text. Pair with onValueChange. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Send the message. Called with the trimmed text; the composer clears itself when uncontrolled. */
  onSend: (text: string) => void;
  /** An answer is arriving: Send becomes Stop, and Enter doesn't send. Typing the next question still works. */
  streaming?: boolean;
  /** Stop the answer that is arriving. */
  onStop?: () => void;
  /** Characters allowed. The count shows from 80% of it; over the limit, Send is disabled with the reason. */
  maxLength?: number;
  /** Chips for attached files, each with a Remove button. */
  attachments?: readonly ComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
  /** Shows an Attach button that opens the file picker. */
  onAttach?: (files: File[]) => void;
  /** The whole composer is unavailable (no permission, a hard limit reached). Say why in `note`. */
  disabled?: boolean;
  /** A quiet line under the box: the disclaimer, or why it's disabled. */
  note?: ReactNode;
}

/**
 * Where the person writes to the assistant: a text box that grows with its content, attachment
 * chips, Send (or Stop while an answer arrives) and a keyboard hint. Enter sends and Shift+Enter
 * adds a line, except while an IME composition is open.
 */
export function Composer({
  label,
  placeholder,
  value,
  defaultValue = '',
  onValueChange,
  onSend,
  streaming = false,
  onStop,
  maxLength,
  attachments = [],
  onRemoveAttachment,
  onAttach,
  disabled = false,
  note = 'AI can make mistakes. Check important info.',
  UNSAFE_className,
  UNSAFE_style,
}: ComposerProps) {
  const format = useFormat();
  const id = useId();
  const files = useRef<HTMLInputElement>(null);
  const [own, setOwn] = useState(defaultValue);
  const text = value ?? own;
  const over = maxLength !== undefined && text.length > maxLength;
  const showCount = maxLength !== undefined && text.length >= maxLength * 0.8;
  const canSend = !disabled && !streaming && !over && text.trim() !== '';

  const change = (next: string) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    change('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  };

  const hintId = `${id}-hint`;
  const countId = `${id}-count`;
  return (
    <form className={cx('composer', UNSAFE_className)} style={UNSAFE_style} onSubmit={send} data-disabled={disabled || undefined}>
      {attachments.length > 0 ? (
        <ul className="composer__attachments" aria-label="Attachments">
          {attachments.map((file) => (
            <li key={file.id}>
              <Tag {...(onRemoveAttachment ? { onRemove: () => onRemoveAttachment(file.id), removeLabel: `Remove ${file.name}` } : {})}>{file.name}</Tag>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="composer__box">
        <label className="visually-hidden" htmlFor={`${id}-input`}>
          {label}
        </label>
        <textarea
          id={`${id}-input`}
          className="composer__input"
          rows={1}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={over || undefined}
          aria-describedby={[hintId, showCount ? countId : ''].filter(Boolean).join(' ')}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => change(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="composer__controls">
          {onAttach ? (
            <>
              <Button variant="ghost" size="sm" icon="plus" disabled={disabled} onClick={() => files.current?.click()}>
                Attach
              </Button>
              <input
                ref={files}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  onAttach([...(event.target.files ?? [])]);
                  event.target.value = '';
                }}
              />
            </>
          ) : null}
          <span className="composer__spacer" />
          {showCount ? (
            <span className="composer__count" id={countId} data-over={over || undefined}>
              {over && maxLength !== undefined
                ? `${format.number(text.length - maxLength)} characters over the limit`
                : `${format.number(text.length)} of ${format.number(maxLength ?? 0)} characters`}
            </span>
          ) : null}
          {streaming ? (
            <Button variant="secondary" size="sm" icon="stop" onClick={onStop}>
              Stop
            </Button>
          ) : (
            <Button type="submit" size="sm" disabled={!canSend}>
              Send
            </Button>
          )}
        </div>
      </div>
      <p className="composer__note" id={hintId}>
        <span className="composer__keys">
          <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for a new line
        </span>
        {note ? <span>{note}</span> : null}
      </p>
    </form>
  );
}
