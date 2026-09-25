import { cx, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import { RouterLink } from '../Link/Link';
import './Breadcrumbs.css';

export interface BreadcrumbLink {
  label: string;
  href: string;
}

export interface BreadcrumbsProps extends EscapeHatch {
  /** Ancestors, outermost first. Every ancestor is a link. */
  items: readonly BreadcrumbLink[];
  /** The current page: plain text with aria-current="page". Matches the page title. */
  current: string;
  /** Accessible name of the navigation landmark. */
  label?: string;
}

/** Path back up a genuinely nested hierarchy. A trail with no ancestors is decoration: leave it out. */
export function Breadcrumbs({ items, current, label = 'Breadcrumb', UNSAFE_className, UNSAFE_style }: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={cx('breadcrumbs', UNSAFE_className)} style={UNSAFE_style}>
      <ol role="list" className="breadcrumbs__list">
        {items.map((item) => (
          <li className="breadcrumbs__item" key={item.href}>
            <RouterLink className="breadcrumbs__link" href={item.href}>
              {item.label}
            </RouterLink>
            <span className="breadcrumbs__separator">
              <Icon name="chevron-right" />
            </span>
          </li>
        ))}
        <li className="breadcrumbs__item">
          <span className="breadcrumbs__current" aria-current="page">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
