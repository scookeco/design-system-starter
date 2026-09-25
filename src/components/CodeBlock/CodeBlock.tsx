import { cx, type EscapeHatch } from '../../internal/closed-api';
import { CopyButton } from '../CopyButton/CopyButton';
import './CodeBlock.css';

export interface CodeBlockProps extends EscapeHatch {
  /** The code, shown exactly as given (leading and trailing blank lines are trimmed). */
  code: string;
  /** Accessible name of the scrollable region and context for the copy button ("Install command"). Required. */
  label: string;
  /** Language shown in the header ("bash", "tsx"). A label only: there is no syntax highlighting. */
  language?: string;
  /** Show a Copy button. */
  copyable?: boolean;
}

/**
 * Monospaced code in a keyboard-scrollable region: long lines scroll sideways instead of wrapping,
 * so what is copied is what is shown. An optional language label and a CopyButton sit above it.
 */
export function CodeBlock({ code, label, language, copyable = true, UNSAFE_className, UNSAFE_style }: CodeBlockProps) {
  const text = code.replace(/^\s*\n|\n\s*$/g, '');
  const header = language || copyable;
  return (
    <div className={cx('code-block', UNSAFE_className)} style={UNSAFE_style}>
      {header ? (
        <div className="code-block__header">
          <span className="code-block__language">{language}</span>
          {copyable ? <CopyButton text={text} variant="ghost" accessibleName={`Copy ${label.charAt(0).toLowerCase()}${label.slice(1)}`} /> : null}
        </div>
      ) : null}
      {/* Focusable and named, so keyboard users can scroll a long line (axe: scrollable-region-focusable). */}
      <pre className="code-block__pre" role="region" aria-label={label} tabIndex={0}>
        <code>{text}</code>
      </pre>
    </div>
  );
}
