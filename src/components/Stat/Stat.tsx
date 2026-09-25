import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon, type IconName } from '../Icon/Icon';
import './Stat.css';

export type StatDirection = 'up' | 'down' | 'flat';
/** Whether the change is good news. Separate from direction: fewer overdue records is down and positive. */
export type StatTone = 'positive' | 'negative' | 'neutral';

export interface StatDelta {
  /** The change, formatted: "12%", "3", "$4,200". The direction word and icon are added for you. */
  value: string;
  direction: StatDirection;
  tone?: StatTone;
}

export interface StatProps extends EscapeHatch {
  /** What is counted ("Active records"). Required. */
  label: string;
  /** The number, formatted for the locale ("1,284", "$1.2M"). Tabular figures. */
  value: string;
  delta?: StatDelta;
  /** What the delta compares against ("vs previous 30 days"). */
  comparison?: string;
  /** Words read before the delta, per direction. Visually the icon carries it. */
  directionLabels?: Record<StatDirection, string>;
}

const DIRECTION_ICON: Record<StatDirection, IconName> = { up: 'trend-up', down: 'trend-down', flat: 'minus' };
const DIRECTION_LABELS: Record<StatDirection, string> = { up: 'Up', down: 'Down', flat: 'No change' };

/**
 * One headline number in a tile: label, value and an optional change. The change shows its
 * direction as an icon and says it in words to assistive tech; its colour (tone) only adds
 * whether that is good or bad.
 */
export function Stat({ label, value, delta, comparison, directionLabels = DIRECTION_LABELS, UNSAFE_className, UNSAFE_style }: StatProps) {
  return (
    <div className={cx('stat', UNSAFE_className)} style={UNSAFE_style}>
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      {delta ? (
        <p className="stat__delta">
          <span className="stat__change" data-tone={delta.tone ?? 'neutral'}>
            <Icon name={DIRECTION_ICON[delta.direction]} />
            <span className="visually-hidden">{`${directionLabels[delta.direction]} `}</span>
            {delta.direction === 'flat' ? null : delta.value}
          </span>
          {comparison ? <span className="stat__comparison">{comparison}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
