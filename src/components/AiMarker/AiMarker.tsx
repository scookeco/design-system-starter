import type { ComponentPropsWithRef } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './AiMarker.css';

export type AiMarkerProps = Closed<Omit<ComponentPropsWithRef<'span'>, 'children'>> & {
  /** What the AI did, in words: "AI-generated", "Drafted with AI", "Suggested by AI". The text carries the meaning; the tint only reinforces it. */
  children?: string;
  /** badge: a pill beside a block or a field. inline: a quiet label inside a line of text or a header. */
  variant?: 'badge' | 'inline';
};

/**
 * Marks content the AI wrote and a person hasn't accepted or edited yet: a sparkle and a text label
 * on the AI tint. Never colour alone, and never on content a person wrote.
 */
export function AiMarker({ children = 'AI-generated', variant = 'badge', UNSAFE_className, UNSAFE_style, ...rest }: AiMarkerProps) {
  return (
    <span {...rest} className={cx('ai-marker', UNSAFE_className)} style={UNSAFE_style} data-variant={variant}>
      <Icon name="sparkle" />
      <span>{children}</span>
    </span>
  );
}
