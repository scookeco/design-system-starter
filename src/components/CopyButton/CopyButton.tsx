import { useEffect, useRef, useState } from 'react';
import type { EscapeHatch } from '../../internal/closed-api';
import { Button, type ButtonSize } from '../Button/Button';
import './CopyButton.css';

export interface CopyButtonProps extends EscapeHatch {
  /** The text put on the clipboard. */
  text: string;
  /** Visible label. */
  label?: string;
  /**
   * Accessible name when the label alone is ambiguous, starting with the label so speech input
   * still matches it ("Copy API key"). Defaults to the label.
   */
  accessibleName?: string;
  /** Label shown, and announced, after a successful copy. */
  copiedLabel?: string;
  /** Announced when the browser refuses the copy. */
  failedMessage?: string;
  /** How long "Copied" shows before the button reverts, in milliseconds. */
  revertAfter?: number;
  variant?: 'secondary' | 'ghost';
  size?: ButtonSize;
  /** Called after a successful copy. */
  onCopy?: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copies a value to the clipboard, confirms with "Copied" in place and a polite announcement,
 * then reverts. If the browser blocks the clipboard it says so and asks the user to copy by hand.
 */
export function CopyButton({
  text,
  label = 'Copy',
  accessibleName,
  copiedLabel = 'Copied',
  failedMessage = 'Couldn’t copy. Select the text and copy it instead.',
  revertAfter = 2000,
  variant = 'secondary',
  size = 'sm',
  onCopy,
  UNSAFE_className,
  UNSAFE_style,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = (next: CopyState) => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), revertAfter);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      settle('copied');
      onCopy?.();
    } catch {
      settle('failed');
    }
  };

  const copied = state === 'copied';
  return (
    <span className="copy-button">
      <Button
        variant={variant}
        size={size}
        icon={copied ? 'check' : 'copy'}
        aria-label={copied ? undefined : accessibleName}
        UNSAFE_className={UNSAFE_className}
        UNSAFE_style={UNSAFE_style}
        onClick={() => void copy()}
      >
        {copied ? copiedLabel : label}
      </Button>
      {/* Rendered from mount, empty, so the text set on copy is announced. */}
      <span className="visually-hidden" role="status">
        {copied ? copiedLabel : state === 'failed' ? failedMessage : ''}
      </span>
    </span>
  );
}
