import { Separator as SeparatorPrimitive } from 'radix-ui';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Divider.css';

export interface DividerProps extends EscapeHatch {
  orientation?: 'horizontal' | 'vertical';
  /**
   * true (the default): a visual line only, hidden from assistive technology.
   * false: role="separator", for a line that divides groups of content people navigate between,
   * such as groups of toolbar controls.
   */
  decorative?: boolean;
}

/**
 * A hairline between blocks or inline groups. Prefer space (the gap of a Stack or Cluster) and
 * headings to separate content; a line is for when space alone doesn't read as a boundary.
 * Behaviour from Radix Separator.
 */
export function Divider({ orientation = 'horizontal', decorative = true, UNSAFE_className, UNSAFE_style }: DividerProps) {
  return <SeparatorPrimitive.Root className={cx('divider', UNSAFE_className)} style={UNSAFE_style} orientation={orientation} decorative={decorative} />;
}
