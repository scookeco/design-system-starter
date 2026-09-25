import { vars, type ContentWidthToken, type InsetToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Center.css';

export type CenterProps = LayoutProps & {
  /** Maximum measure of the content. */
  max?: ContentWidthToken;
  /** Minimum space on either side when the viewport is narrower than `max`. */
  gutters?: InsetToken;
  /** Also centre children on the inline axis (empty states, short messages). */
  intrinsic?: boolean;
};

/** Horizontally centred column with a bounded measure. */
export function Center({
  as: Element = 'div',
  max = 'lg',
  gutters = 'md',
  intrinsic = false,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: CenterProps) {
  return (
    <Element
      {...rest}
      className={cx('center', UNSAFE_className)}
      data-intrinsic={intrinsic ? 'true' : undefined}
      style={tokenStyle({ '--center-max': vars.size.content[max], '--center-gutter': vars.space.inset[gutters] }, UNSAFE_style)}
    />
  );
}
