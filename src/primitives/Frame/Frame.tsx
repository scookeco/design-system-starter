import { vars, type RatioToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Frame.css';

export type FrameProps = LayoutProps & {
  /** Aspect ratio the media is held to. */
  ratio?: RatioToken;
};

/**
 * Holds media (an img, video or iframe) to a fixed aspect ratio and crops it to fill, so a grid
 * of thumbnails lines up whatever the source sizes. Other content is centred in the frame.
 */
export function Frame({ as: Element = 'div', ratio = 'landscape', UNSAFE_className, UNSAFE_style, ...rest }: FrameProps) {
  return (
    <Element {...rest} className={cx('frame', UNSAFE_className)} style={tokenStyle({ '--frame-ratio': vars.ratio[ratio] }, UNSAFE_style)} />
  );
}
