import { cx, type EscapeHatch } from '../../internal/closed-api';
import './Skeleton.css';

export type SkeletonShape = 'text' | 'block' | 'table-row';

export interface SkeletonProps extends EscapeHatch {
  /** Mirror the shape of what is loading: lines of text, a block (card, chart), or a table row. */
  shape?: SkeletonShape;
  /** text: number of lines. The last one is shorter, like a paragraph. */
  lines?: number;
  /** table-row: number of cells. Render inside TableBody, under the real header. */
  columns?: number;
}

const LENGTHS = ['long', 'medium', 'short'] as const;

/**
 * Placeholder for content on first load. Hidden from assistive tech: mark the region that is
 * loading with aria-busy="true" and say what is loading in text (a status line or Spinner label).
 * On refresh keep the existing content instead; never swap usable values for skeletons.
 * The pulse stops under prefers-reduced-motion (motion.pulse collapses to 0ms).
 */
export function Skeleton({ shape = 'text', lines = 3, columns = 4, UNSAFE_className, UNSAFE_style }: SkeletonProps) {
  const className = cx('skeleton', UNSAFE_className);
  if (shape === 'table-row') {
    return (
      <tr className={className} style={UNSAFE_style} data-shape={shape} aria-hidden="true">
        {Array.from({ length: columns }, (_, i) => (
          <td className="skeleton__cell" key={i}>
            <span className="skeleton__bar" data-length={LENGTHS[i % LENGTHS.length]} />
          </td>
        ))}
      </tr>
    );
  }
  if (shape === 'block') {
    return <div className={className} style={UNSAFE_style} data-shape={shape} aria-hidden="true" />;
  }
  return (
    <div className={className} style={UNSAFE_style} data-shape={shape} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span className="skeleton__bar" key={i} data-length={i === lines - 1 && lines > 1 ? 'medium' : 'full'} />
      ))}
    </div>
  );
}
