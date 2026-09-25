import type { ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Heading, type HeadingLevel } from '../Heading/Heading';
import { Icon, type IconName } from '../Icon/Icon';
import { Text } from '../Text/Text';
import './EmptyState.css';

/**
 * Why the region is empty. Decide it from the unfiltered collection, never from the rows on
 * screen: "nothing yet" and "nothing matches" need different words and a different action.
 */
export type EmptyStateReason = 'first-use' | 'no-results' | 'error';

const REASON_ICON: Record<EmptyStateReason, IconName> = {
  'first-use': 'plus',
  'no-results': 'search',
  error: 'warning',
};

export interface EmptyStateProps extends EscapeHatch {
  reason: EmptyStateReason;
  /** "Create your first record" · "No records match" · "Couldn't load records". Required. */
  title: string;
  /** One sentence: what fills this space, how to widen the search, or what failed. */
  description?: string;
  /**
   * One action. first-use: the same action as the page's primary button. no-results: clear
   * filters. error: Retry.
   */
  action?: ReactNode;
  /** Outline level of the title. Defaults to 2 (a region inside a page with an h1). */
  headingLevel?: HeadingLevel;
}

/** What a list, table or panel shows instead of its content. Render it or the content, never both. */
export function EmptyState({ reason, title, description, action, headingLevel = 2, UNSAFE_className, UNSAFE_style }: EmptyStateProps) {
  return (
    <div className={cx('empty-state', UNSAFE_className)} style={UNSAFE_style} data-reason={reason}>
      <span className="empty-state__mark">
        <Icon name={REASON_ICON[reason]} size="md" />
      </span>
      <div className="empty-state__text">
        <Heading level={headingLevel} size={4}>
          {title}
        </Heading>
        {description ? <Text tone="muted">{description}</Text> : null}
      </div>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
