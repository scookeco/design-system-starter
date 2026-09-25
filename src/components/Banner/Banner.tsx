import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import './Banner.css';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICON: Record<BannerTone, IconName> = { info: 'info', success: 'success', warning: 'warning', danger: 'danger' };

export type BannerProps = Closed<Omit<ComponentPropsWithRef<'div'>, 'title' | 'role' | 'children'>> & {
  /** Severity. Always shown as icon + text as well as colour. */
  tone?: BannerTone;
  /** Short bold lead ("Seat limit almost reached"). */
  title?: string;
  /** One sentence, or a list of links (an error summary). */
  children: ReactNode;
  /** The fixing action, as a Button ("Add seats", "Review import"). */
  action?: ReactNode;
  /** Shows a dismiss button. The caller removes the banner. */
  onDismiss?: () => void;
  dismissLabel?: string;
  /**
   * Live-region semantics by tone: danger and warning are role="alert" (assertive), info and
   * success role="status" (polite). Render the banner when the condition starts; a banner present
   * at page load is announced too, so keep load-time banners rare. Set false when focus moves to
   * the banner instead (an error summary): announcing it as well would say it twice. A banner
   * that isn't announced but has a title becomes a named region, so moving focus to it (with
   * tabIndex={-1}) still tells assistive technology what it is.
   */
  announce?: boolean;
};

/** Ongoing state for a page or region: sits full width at the top of what it describes. Events get a Toast. */
export function Banner({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
  announce = true,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: BannerProps) {
  const titleId = useId();
  const role = announce ? (tone === 'danger' || tone === 'warning' ? 'alert' : 'status') : title ? 'region' : undefined;
  return (
    <div
      {...rest}
      role={role}
      aria-labelledby={title ? titleId : undefined}
      className={cx('banner', UNSAFE_className)} style={UNSAFE_style} data-tone={tone}>
      <span className="banner__icon">
        <Icon name={TONE_ICON[tone]} size="md" />
      </span>
      <div className="banner__text">
        {title ? (
          <p id={titleId} className="banner__title">
            {title}
          </p>
        ) : null}
        <div className="banner__message">{children}</div>
      </div>
      {action ? <div className="banner__action">{action}</div> : null}
      {onDismiss ? (
        <button type="button" className="banner__dismiss" aria-label={dismissLabel} onClick={onDismiss}>
          <Icon name="close" />
        </button>
      ) : null}
    </div>
  );
}
