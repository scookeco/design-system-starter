import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Closed<ComponentPropsWithRef<'button'>> & {
  /** Visual intent. A new look is a new variant here, never a new component. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon from the system set. Decorative: the label remains the accessible name. */
  icon?: IconName;
  /**
   * Pending state: shows a spinner, keeps the label (so the accessible name survives)
   * and blocks activation with aria-disabled, so focus is not lost.
   */
  loading?: boolean;
  /** Visible label. Required: icon-only buttons need `aria-label` and a Tooltip. */
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  type = 'button',
  children,
  onClick,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      {...rest}
      type={type}
      className={cx('button', UNSAFE_className)}
      style={UNSAFE_style}
      data-variant={variant}
      data-size={size}
      data-state={loading ? 'loading' : undefined}
      aria-disabled={loading ? true : rest['aria-disabled']}
      onClick={handleClick}
    >
      {loading ? <span className="button__spinner" aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
      <span className="button__label">{children}</span>
    </button>
  );
}
