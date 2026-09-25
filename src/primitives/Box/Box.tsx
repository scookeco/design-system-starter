import { vars, type InsetToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Box.css';

export type BoxProps = LayoutProps & {
  /** Padding on every side. Token-typed: raw values are not accepted. */
  padding?: InsetToken;
  /** Overrides `padding` on the block axis (top and bottom in horizontal writing). */
  paddingBlock?: InsetToken;
  /** Overrides `padding` on the inline axis (start and end). */
  paddingInline?: InsetToken;
};

/**
 * Padding around content, from the inset scale: the box inside a region that has no component
 * of its own (a toolbar strip, a panel's body). A surface with a border and a heading is a Card.
 */
export function Box({ as: Element = 'div', padding = 'md', paddingBlock, paddingInline, UNSAFE_className, UNSAFE_style, ...rest }: BoxProps) {
  return (
    <Element
      {...rest}
      className={cx('box', UNSAFE_className)}
      style={tokenStyle(
        { '--box-padding-block': vars.space.inset[paddingBlock ?? padding], '--box-padding-inline': vars.space.inset[paddingInline ?? padding] },
        UNSAFE_style,
      )}
    />
  );
}
