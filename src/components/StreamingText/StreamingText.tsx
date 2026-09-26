import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Markdown, toSpeech } from '../Markdown/Markdown';
import './StreamingText.css';

/** Where an answer is: waiting for its first token, arriving, finished, stopped by the person, or failed. */
export type StreamStatus = 'pending' | 'streaming' | 'complete' | 'stopped' | 'error';

export interface StreamingTextProps extends EscapeHatch {
  /** Everything received so far, as Markdown. The parent appends tokens; this renders what it's given. */
  text: string;
  status?: StreamStatus;
  /** Renders a numbered citation ([1]) found in the text, usually a Citation. */
  citation?: (number: number) => ReactNode;
  /** Shown, and announced, before the first token arrives. */
  pendingLabel?: string;
  /** Announced when the person stops the answer. */
  stoppedLabel?: string;
  /** Accessible name of code blocks in the answer. */
  codeLabel?: string;
}

/**
 * The end of the last complete sentence or paragraph in `text`, at or after `from`: a . ! ? or :
 * followed by whitespace, or a blank line. -1 when there is none yet.
 */
export const lastBoundary = (text: string, from: number): number => {
  let end = -1;
  const pattern = /[.!?:](?=\s)|\n\s*\n/g;
  pattern.lastIndex = from;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) end = match.index + match[0].length;
  return end;
};

/**
 * Text that arrives token by token (an AI answer), rendered as safe Markdown with a caret while it
 * streams. It holds no timers: the parent appends to `text`, so a story or test can pin any moment.
 *
 * Screen readers hear it through one polite live region, present from mount: "Generating…", then
 * each sentence or paragraph once it is complete (never token by token, and never the whole answer
 * again at the end), then "Stopped" if the person stops it. Text already there on mount (history)
 * is not announced.
 */
export function StreamingText({
  text,
  status = 'complete',
  citation,
  pendingLabel = 'Generating…',
  stoppedLabel = 'Stopped.',
  codeLabel = 'Code from the answer',
  UNSAFE_className,
  UNSAFE_style,
}: StreamingTextProps) {
  const live = status === 'pending' || status === 'streaming';
  const [announcement, setAnnouncement] = useState(live ? pendingLabel : '');
  // How much of the text has been announced. What was there on mount counts as heard.
  const spoken = useRef(text.length);

  useEffect(() => {
    if (text.length < spoken.current) spoken.current = 0; // A new answer (retry) replaced the text.
    const end = live ? lastBoundary(text, spoken.current) : text.length;
    const fresh = end > spoken.current ? toSpeech(text.slice(spoken.current, end)) : '';
    if (end > spoken.current) spoken.current = end;
    if (fresh) setAnnouncement(status === 'stopped' ? `${fresh} ${stoppedLabel}` : fresh);
    else if (status === 'stopped') setAnnouncement(stoppedLabel);
    else if (status === 'pending') setAnnouncement(pendingLabel);
  }, [text, status, live, pendingLabel, stoppedLabel]);

  return (
    <div className={cx('streaming-text', UNSAFE_className)} style={UNSAFE_style} data-status={status}>
      {status === 'pending' && text === '' ? (
        <p className="streaming-text__pending">
          <span className="streaming-text__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {pendingLabel}
        </p>
      ) : (
        <Markdown source={text} citation={citation} codeLabel={codeLabel} trailing={status === 'streaming' ? <span className="streaming-text__caret" aria-hidden="true" /> : null} />
      )}
      <span className="visually-hidden" role="status">
        {announcement}
      </span>
    </div>
  );
}
