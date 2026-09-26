import { useState, type FormEvent } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Button } from '../Button/Button';
import { RadioGroup } from '../RadioGroup/RadioGroup';
import { Toggle } from '../Toggle/Toggle';
import './Feedback.css';

export type FeedbackRating = 'up' | 'down';

export interface FeedbackValue {
  rating: FeedbackRating;
  /** The reason chosen after a thumbs down, if any. */
  reason?: string;
}

export interface FeedbackProps extends EscapeHatch {
  /** Called on a thumbs up at once, and on a thumbs down when the reason is sent or skipped. */
  onFeedback: (feedback: FeedbackValue) => void;
  /** Names what is being rated, for the group's accessible name ("Rate this answer"). */
  label?: string;
  /** Choices offered after a thumbs down. Keep them few and specific. */
  reasons?: readonly string[];
  /** Shown, and announced, once feedback is sent: say what it's for. */
  thanks?: string;
  /** A rating already given (a reloaded conversation). */
  defaultValue?: FeedbackValue;
}

const REASONS = ['Not accurate', 'Didn’t answer the question', 'Cited the wrong source', 'Something else'] as const;

/**
 * Thumbs up or down on one AI result, with an optional reason after a thumbs down. Both are toggle
 * buttons (aria-pressed) with visible labels; a polite status confirms what was sent.
 */
export function Feedback({
  onFeedback,
  label = 'Rate this answer',
  reasons = REASONS,
  thanks = 'Thanks. Feedback helps us check and improve answers.',
  defaultValue,
  UNSAFE_className,
  UNSAFE_style,
}: FeedbackProps) {
  const [rating, setRating] = useState<FeedbackRating | undefined>(defaultValue?.rating);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(defaultValue !== undefined);

  const rate = (next: FeedbackRating, pressed: boolean) => {
    if (!pressed) {
      setRating(undefined);
      setAsking(false);
      setSent(false);
      return;
    }
    setRating(next);
    setSent(next === 'up');
    setAsking(next === 'down');
    if (next === 'up') onFeedback({ rating: 'up' });
  };

  const send = (event?: FormEvent, withReason = true) => {
    event?.preventDefault();
    onFeedback(withReason && reason ? { rating: 'down', reason } : { rating: 'down' });
    setAsking(false);
    setSent(true);
  };

  return (
    <div className={cx('feedback', UNSAFE_className)} style={UNSAFE_style}>
      <div className="feedback__row">
        <div className="feedback__buttons" role="group" aria-label={label}>
          <Toggle size="sm" icon="thumbs-up" label="Helpful" pressed={rating === 'up'} onPressedChange={(pressed) => rate('up', pressed)} />
          <Toggle size="sm" icon="thumbs-down" label="Not helpful" pressed={rating === 'down'} onPressedChange={(pressed) => rate('down', pressed)} />
        </div>
        {/* Present from mount, so the thanks is announced when it appears. */}
        <span className="feedback__thanks" role="status">
          {sent ? thanks : ''}
        </span>
      </div>
      {asking ? (
        <form className="feedback__reason" onSubmit={send}>
          <RadioGroup
            label="What was wrong?"
            options={reasons.map((r) => ({ value: r, label: r }))}
            value={reason}
            onValueChange={setReason}
          />
          <div className="feedback__actions">
            <Button type="submit" size="sm" variant="secondary">
              Send feedback
            </Button>
            <Button size="sm" variant="ghost" onClick={() => send(undefined, false)}>
              Skip
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
