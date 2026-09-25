import type { ReactNode } from 'react';
import { vars, type GapToken } from '../../tokens/tokens';
import { cx, tokenStyle } from '../../internal/closed-api';
import type { LayoutProps } from '../types';
import './Imposter.css';

export type ImposterProps = LayoutProps & {
  /** The content underneath: what the overlay sits over. */
  children?: ReactNode;
  /** What sits over the centre of the content: a notice, an upgrade prompt, a loading message. */
  overlay?: ReactNode;
  /** Keep the overlay inside the container, scrolling it if it is taller. Defaults to true. */
  contain?: boolean;
  /**
   * Names the overlay as a region and puts it in the tab order, so keyboard users can scroll it.
   * Set it when a contained overlay can be taller than its container.
   */
  overlayLabel?: string;
  /** Least space between the overlay and the container's edges. */
  margin?: GapToken;
  /**
   * Makes the content underneath inert (not focusable, hidden from assistive technology) while
   * the overlay covers it. Set it whenever the overlay hides what is underneath.
   */
  inertContent?: boolean;
};

/**
 * Positions an overlay over the centre of its container, not the viewport: a notice over a chart
 * with no data, a prompt over a locked panel. The container is the Imposter itself, so no
 * positioning CSS is needed. For anything that must take focus and block the page, use Dialog.
 */
export function Imposter({
  as: Element = 'div',
  children,
  overlay,
  contain = true,
  overlayLabel,
  margin = 'md',
  inertContent = false,
  UNSAFE_className,
  UNSAFE_style,
  ...rest
}: ImposterProps) {
  return (
    <Element {...rest} className={cx('imposter', UNSAFE_className)} style={tokenStyle({ '--imposter-margin': vars.space.gap[margin] }, UNSAFE_style)}>
      <div className="imposter__content" inert={inertContent && overlay ? true : undefined}>
        {children}
      </div>
      {overlay ? (
        <div className="imposter__layer" data-contain={contain ? 'true' : 'false'}>
          <div className="imposter__overlay" role={overlayLabel ? 'region' : undefined} aria-label={overlayLabel} tabIndex={overlayLabel ? 0 : undefined}>
            {overlay}
          </div>
        </div>
      ) : null}
    </Element>
  );
}
