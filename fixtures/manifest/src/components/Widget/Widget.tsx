import type { ButtonHTMLAttributes, CSSProperties } from 'react';

export type WidgetTone = 'calm' | 'loud' | 'quiet';

export type WidgetProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> & {
  /** How loud it is. */
  tone?: WidgetTone;
  /** Visible label. */
  label: string;
  busy?: boolean;
  /** @deprecated Use tone. */
  loud?: boolean;
  UNSAFE_className?: string;
  UNSAFE_style?: CSSProperties;
};

/**
 * A widget for the manifest test.
 * @status beta
 */
export function Widget({ tone = 'calm', label, busy = false, ...rest }: WidgetProps) {
  return (
    <button {...rest} data-tone={tone} aria-busy={busy}>
      {label}
    </button>
  );
}
