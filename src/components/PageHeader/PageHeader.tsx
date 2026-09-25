import type { ReactNode, Ref } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Heading } from '../Heading/Heading';
import { Text } from '../Text/Text';
import './PageHeader.css';

export interface PageHeaderProps extends EscapeHatch {
  /** The page title, rendered as the page's one h1. Matches the nav item or breadcrumb that leads here. */
  title: string;
  /** A status beside the title: a system Badge mapped from the domain status. */
  status?: ReactNode;
  /** One line under the title: what the page is for, or the record's key metadata. */
  description?: ReactNode;
  /** Page actions: secondary first, the one primary action last, then a "More" Menu. Right-aligned; they wrap. */
  actions?: ReactNode;
  /**
   * Ref to the h1, for moving focus to it after a client-side step or route change. When set,
   * the heading takes tabIndex={-1} so it can receive focus without entering the tab order.
   */
  headingRef?: Ref<HTMLHeadingElement>;
}

/**
 * The top of every page: title (h1), optional status and description, and the page's actions.
 * Breadcrumbs are not here: AppShell's header owns them.
 */
export function PageHeader({ title, status, description, actions, headingRef, UNSAFE_className, UNSAFE_style }: PageHeaderProps) {
  return (
    <header className={cx('page-header', UNSAFE_className)} style={UNSAFE_style}>
      <div className="page-header__text">
        <div className="page-header__title">
          <Heading level={1} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
            {title}
          </Heading>
          {status}
        </div>
        {description ? <Text tone="muted">{description}</Text> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
