import type { ComponentPropsWithRef } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import './Badge.css';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_ICON: Record<BadgeTone, IconName | null> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  neutral: null,
};

export type BadgeProps = Closed<Omit<ComponentPropsWithRef<'span'>, 'children'>> & {
  /** Status tone. Map domain statuses to tones in one place; a new status extends the map, not the Badge. */
  tone?: BadgeTone;
  /** Non-colour cue beside the text: a tone icon (default) or a dot. */
  indicator?: 'icon' | 'dot' | 'none';
  /** Text label. Required: status is never conveyed by colour alone. */
  children: string;
};

export function Badge({ tone = 'neutral', indicator = 'icon', children, UNSAFE_className, UNSAFE_style, ...rest }: BadgeProps) {
  const icon = TONE_ICON[tone];
  return (
    <span {...rest} className={cx('badge', UNSAFE_className)} style={UNSAFE_style} data-tone={tone}>
      {indicator === 'dot' ? <span className="badge__dot" aria-hidden="true" /> : null}
      {indicator === 'icon' && icon ? <Icon name={icon} /> : null}
      <span className="badge__label">{children}</span>
    </span>
  );
}
