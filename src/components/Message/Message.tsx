import { useId, type ReactNode } from 'react';
import { useFormat } from '../../format/LocaleProvider';
import type { DateInput } from '../../format/format';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { AiMarker } from '../AiMarker/AiMarker';
import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { CopyButton } from '../CopyButton/CopyButton';
import { Icon } from '../Icon/Icon';
import type { StreamStatus } from '../StreamingText/StreamingText';
import './Message.css';

/** Who a turn is from: the person, the assistant, a tool the assistant ran, or the system (a note in the thread). */
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

export interface MessageProps extends EscapeHatch {
  role: MessageRole;
  /** Who it's from, shown in the header and naming the message ("You", "Assistant", "Search records"). */
  author: string;
  /** When it was sent. Formatted with useFormat(); omit for pending turns. */
  time?: DateInput;
  /** An assistant turn's state: its actions show once it's no longer pending or streaming. */
  status?: StreamStatus;
  /** The content: StreamingText for assistant turns, text for user turns, a Disclosure for tool activity. */
  children: ReactNode;
  /** Why the turn failed, with the next step ("Too many requests. Try again in 30 seconds."). */
  error?: string;
  /** The turn's text for Copy. Shows a Copy action. */
  copyText?: string;
  /** Shows Retry (assistant: ask again; user: resend a failed message). */
  onRetry?: () => void;
  /** Shows Edit on a user turn: puts its text back in the composer. */
  onEdit?: () => void;
  /** A Feedback control for an assistant turn. */
  feedback?: ReactNode;
  /** The AI mark on an assistant turn. Defaults to an AiMarker; pass null only where the whole surface is already marked. */
  marker?: ReactNode;
  /** Shown under a stopped turn, so it doesn't read as a finished answer. */
  stoppedLabel?: string;
}

/**
 * One turn in a ChatThread: a header (who, when, the AI mark), the content, and actions (copy,
 * retry, edit, feedback) once it has finished. User turns are tinted and aligned to the inline end;
 * assistant turns run full width. Tool and system turns are compact notes. Render inside ChatThread.
 */
export function Message({
  role,
  author,
  time,
  status = 'complete',
  children,
  error,
  copyText,
  onRetry,
  onEdit,
  feedback,
  marker = role === 'assistant' ? <AiMarker variant="inline" /> : null,
  stoppedLabel = 'Stopped before the answer finished.',
  UNSAFE_className,
  UNSAFE_style,
}: MessageProps) {
  const format = useFormat();
  const headerId = useId();
  const settled = status !== 'pending' && status !== 'streaming';
  const hasActions = settled && (copyText !== undefined || onRetry !== undefined || onEdit !== undefined || feedback !== undefined);

  if (role === 'system') {
    return (
      <p className={cx('message', UNSAFE_className)} style={UNSAFE_style} data-role={role}>
        {children}
      </p>
    );
  }

  return (
    <article className={cx('message', UNSAFE_className)} style={UNSAFE_style} data-role={role} data-status={status} aria-labelledby={headerId}>
      <div className="message__header">
        {role === 'user' ? (
          <Avatar name={author} size="sm" decorative />
        ) : (
          <span className="message__avatar" aria-hidden="true">
            <Icon name="sparkle" />
          </span>
        )}
        <span className="message__author" id={headerId}>
          {author}
        </span>
        {time !== undefined ? (
          <time className="message__time" dateTime={new Date(time).toISOString()}>
            {format.time(time)}
          </time>
        ) : null}
        {marker}
      </div>
      <div className="message__body">{children}</div>
      {status === 'stopped' ? <p className="message__note">{stoppedLabel}</p> : null}
      {error ? (
        <p className="message__error" role="alert">
          <Icon name="danger" />
          <span>{error}</span>
        </p>
      ) : null}
      {hasActions ? (
        <div className="message__actions">
          {copyText !== undefined ? <CopyButton text={copyText} variant="ghost" accessibleName={`Copy ${role === 'user' ? 'message' : 'answer'}`} /> : null}
          {onEdit ? (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {onRetry ? (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {feedback}
        </div>
      ) : null}
    </article>
  );
}
