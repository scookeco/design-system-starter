import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { vars, type ScrollRegionToken } from '../../tokens/tokens';
import { cx, tokenStyle, type Closed, type EscapeHatch } from '../../internal/closed-api';
import { Icon } from '../Icon/Icon';
import './Table.css';

export interface TableProps extends EscapeHatch {
  /** Caption: the table's accessible name. Required. */
  caption: string;
  hideCaption?: boolean;
  /** Cap the height so the sticky header scrolls with the rows. Defaults to no cap. */
  maxHeight?: ScrollRegionToken;
  children: ReactNode;
}

/**
 * Data table: native table semantics, sticky header, tabular numbers.
 * The scroll container is a focusable, labelled region so keyboard users can scroll it.
 */
export function Table({ caption, hideCaption = false, maxHeight, children, UNSAFE_className, UNSAFE_style }: TableProps) {
  const captionId = useId();
  return (
    <div
      className={cx('table', UNSAFE_className)}
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      style={tokenStyle({ '--table-max-height': maxHeight ? vars.size['scroll-region'][maxHeight] : undefined }, UNSAFE_style)}
    >
      <table className="table__table">
        <caption id={captionId} className={hideCaption ? 'visually-hidden' : 'table__caption'}>
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="table__head">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export type TableRowProps = Closed<ComponentPropsWithRef<'tr'>>;

export function TableRow({ UNSAFE_className, UNSAFE_style, ...rest }: TableRowProps) {
  return <tr {...rest} className={cx('table__row', UNSAFE_className)} style={UNSAFE_style} />;
}

export type SortDirection = 'ascending' | 'descending';

export interface TableHeaderCellProps {
  children: ReactNode;
  /** Right-align (inline-end) numeric columns so digits line up. */
  numeric?: boolean;
  /** Current sort of this column. Omit on unsorted columns. */
  sort?: SortDirection | undefined;
  /** Makes the header a sort button. aria-sort is set on the header cell. */
  onSort?: () => void;
}

export function TableHeaderCell({ children, numeric = false, sort, onSort }: TableHeaderCellProps) {
  const icon = sort === 'ascending' ? 'sort-ascending' : sort === 'descending' ? 'sort-descending' : 'sort-none';
  return (
    <th className="table__header-cell" scope="col" aria-sort={sort} data-numeric={numeric ? 'true' : undefined}>
      {onSort ? (
        <button type="button" className="table__sort" onClick={onSort}>
          {children}
          <Icon name={icon} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export interface TableCellProps {
  children?: ReactNode;
  numeric?: boolean;
  /** Mark the cell that names the row (usually the first) as a row header. */
  rowHeader?: boolean;
}

export function TableCell({ children, numeric = false, rowHeader = false }: TableCellProps) {
  const Element = rowHeader ? 'th' : 'td';
  return (
    <Element className="table__cell" scope={rowHeader ? 'row' : undefined} data-numeric={numeric ? 'true' : undefined}>
      {children}
    </Element>
  );
}
