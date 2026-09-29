/**
 * The list page's Scroll display: every matching record in one scrolling table, for lists too
 * long to page through ten at a time. Example code over the app layer, composed from the system's
 * Table; a second windowed list would be the moment to promote the pattern.
 *
 *   data       the same server-side query as the table, read a server page (100 rows) at a time as
 *              rows come into view (useRecordWindow): ordinary list queries, so writes, live events
 *              and refetches keep them right like any other list
 *   rendering  only the rows in view, plus overscan (useWindowedRows); spacers stand in for the rest.
 *              Rows are projected with the memoised toRows, so scrolling never re-projects a page
 *   semantics  still a table: its caption, headers and sort buttons stay, `rowCount` gives
 *              aria-rowcount for every row, and each rendered row has its aria-rowindex. A table,
 *              not a list, because these are records compared across the same columns; a list
 *              would lose the column headers a screen reader reads with each cell
 *   keyboard   Tab moves through the rendered rows as in the table (focus scrolls the next ones in);
 *              ↑ and ↓ move to the same control in the row above or below, Home and End to the
 *              first and last row, loading it first. The row holding focus stays rendered
 *   selection  a checkbox per row, named after it; the header box selects all N matching (the
 *              selection is then the filter, as on the table)
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Badge, Checkbox, Cluster, Link, Skeleton, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, useFormat, type SortDirection } from '../index';
import type { RecordColumn, RecordFilter, RecordQuery } from '../app/api/schemas';
import { toRows, type RecordRow } from '../app/model/projections';
import { useRecordWindow, WINDOW_PAGE_SIZE } from '../app/model/queries';
import { EMPTY_SELECTION, isSelected, selectMatching, toggleRow, type Selection } from '../app/model/selection';
import { AccountRef, PersonRef } from '../app/registries/refs';
import { useWindowedRows } from '../app/windowing';

type SortColumn = 'name' | 'amount' | 'updated';

export interface RecordScrollTableProps {
  /** The list's query, without paging: the window pages it. */
  query: Omit<RecordQuery, 'page' | 'pageSize'>;
  /** Every row the query matches (the server's total). */
  total: number;
  /** The visible optional columns. */
  shown: ReadonlySet<RecordColumn>;
  sort: { column: SortColumn; direction: SortDirection };
  onSort: (column: SortColumn) => void;
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  /** A row's link was followed (restoration remembers it). */
  onOpen: (link: HTMLAnchorElement) => void;
}

/** The Table's scroll container is its labelled, focusable region (see Table's docs). */
const tableRegion = (row: HTMLElement) => row.closest<HTMLElement>('[role="region"]');

/** The keys that move between rows, and where each goes. */
const MOVES: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (i, n) => Math.min(n - 1, i + 1),
  ArrowUp: (i) => Math.max(0, i - 1),
  Home: () => 0,
  End: (_, n) => n - 1,
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])';

export function RecordScrollTable({ query, total, shown, sort, onSort, selection, onSelectionChange, onOpen }: RecordScrollTableProps) {
  const format = useFormat();
  const [focused, setFocused] = useState<number | undefined>();
  const [pendingFocus, setPendingFocus] = useState<{ index: number; column: number } | undefined>();
  const win = useWindowedRows({ count: total, pinned: focused, findScroller: tableRegion });
  const data = useRecordWindow(query, win.first, win.last);
  const rowElements = useRef(new Map<number, HTMLTableRowElement>());
  const filter: RecordFilter = { q: query.q, status: query.status, view: query.view };
  const columns = 2 + shown.size;

  const rowAt = (index: number): RecordRow | undefined => {
    const page = data.pageAt(index);
    return page ? toRows(page)[index % WINDOW_PAGE_SIZE] : undefined;
  };
  const rendered = win.slots.flatMap((slot) => (slot.kind === 'row' ? [rowAt(slot.index)] : [])).filter((row): row is RecordRow => row !== undefined);

  // Arrow keys, Home and End: once the target row is rendered (and loaded), focus its control in the same column.
  useEffect(() => {
    if (!pendingFocus) return;
    const row = rowElements.current.get(pendingFocus.index);
    const control = row?.cells[pendingFocus.column]?.querySelector<HTMLElement>(FOCUSABLE) ?? row?.querySelector<HTMLElement>(FOCUSABLE);
    if (!control) return;
    control.focus();
    setPendingFocus(undefined);
    // `data` changes as pages load: the target row may only now have its controls.
  }, [pendingFocus, data]);

  const onRowKeyDown = (index: number) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    const move = MOVES[event.key];
    const cell = (event.target as HTMLElement).closest('td, th');
    if (!move || !cell || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    const next = move(index, total);
    // The row holding focus stays pinned until the target's control takes it (its onFocus), so focus is
    // never dropped while the target's page loads.
    setPendingFocus({ index: next, column: (cell as HTMLTableCellElement).cellIndex });
    win.scrollToIndex(next);
  };

  const allSelected = selection.scope === 'matching' ? true : selection.rows.size > 0 ? 'indeterminate' : false;

  return (
    <Table caption="Records" hideCaption maxHeight="md" rowCount={total + 1}>
      <TableHead>
        <TableRow aria-rowindex={1}>
          <TableHeaderCell>
            <Checkbox
              label={`Select all ${format.number(total)} matching`}
              hideLabel
              checked={allSelected}
              onCheckedChange={() => onSelectionChange(selection.scope === 'matching' ? EMPTY_SELECTION : selectMatching(filter, total))}
            />
          </TableHeaderCell>
          <TableHeaderCell sort={sort.column === 'name' ? sort.direction : undefined} onSort={() => onSort('name')}>
            Name
          </TableHeaderCell>
          {shown.has('owner') ? <TableHeaderCell>Owner</TableHeaderCell> : null}
          {shown.has('account') ? <TableHeaderCell>Account</TableHeaderCell> : null}
          {shown.has('status') ? <TableHeaderCell>Status</TableHeaderCell> : null}
          {shown.has('updated') ? (
            <TableHeaderCell sort={sort.column === 'updated' ? sort.direction : undefined} onSort={() => onSort('updated')}>
              Updated
            </TableHeaderCell>
          ) : null}
          {shown.has('amount') ? (
            <TableHeaderCell numeric sort={sort.column === 'amount' ? sort.direction : undefined} onSort={() => onSort('amount')}>
              Amount
            </TableHeaderCell>
          ) : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {win.slots.map((slot) => {
          if (slot.kind === 'gap') {
            return (
              // eslint-disable-next-line no-restricted-syntax -- a spacer stands in for rows that aren't rendered: its height is computed at runtime from their count and the measured row height; owner: app layer; remove when: Table supports windowed rows itself
              <TableRow key={slot.key} aria-hidden="true" UNSAFE_style={{ blockSize: `${String(slot.rows * win.rowHeight)}px` }} />
            );
          }
          const row = rowAt(slot.index);
          // Not loaded yet: a placeholder the size of a row, hidden from assistive tech like any skeleton.
          if (!row) return <Skeleton key={slot.index} shape="table-row" columns={columns} />;
          return (
            <TableRow
              key={row.id}
              ref={(element) => {
                win.attach(element);
                if (element) rowElements.current.set(slot.index, element);
                else rowElements.current.delete(slot.index);
              }}
              aria-rowindex={slot.index + 2}
              selected={isSelected(selection, row.id)}
              onKeyDown={onRowKeyDown(slot.index)}
              onFocus={() => setFocused(slot.index)}
              // Focus left the row: it no longer needs pinning (moving to another row pins that one).
              onBlur={() => setFocused((current) => (current === slot.index ? undefined : current))}
            >
              <TableCell>
                <Checkbox
                  label={`Select ${row.name}`}
                  hideLabel
                  checked={isSelected(selection, row.id)}
                  onCheckedChange={(checked) => onSelectionChange(toggleRow(selection, rendered, row, checked === true))}
                />
              </TableCell>
              <TableCell rowHeader>
                <Link href={`/records/${row.id}`} onClick={(event) => onOpen(event.currentTarget)}>
                  {row.name}
                </Link>
              </TableCell>
              {shown.has('owner') ? (
                <TableCell>
                  <PersonRef id={row.ownerId} plain />
                </TableCell>
              ) : null}
              {shown.has('account') ? (
                <TableCell>
                  <AccountRef id={row.accountId} />
                </TableCell>
              ) : null}
              {shown.has('status') ? (
                <TableCell>
                  <Cluster gap="2xs">
                    <Badge tone={row.status.tone}>{row.status.label}</Badge>
                    {row.legalHold ? <Badge tone="warning">Legal hold</Badge> : null}
                  </Cluster>
                </TableCell>
              ) : null}
              {shown.has('updated') ? <TableCell>{format.date(row.updatedAt)}</TableCell> : null}
              {shown.has('amount') ? <TableCell numeric>{format.money(row.amount.minor, row.amount.currency)}</TableCell> : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Below the Scroll display, in place of the pager: how many rows, as the page's one live count. */
export function ScrollSummary({ total }: { total: number }) {
  const format = useFormat();
  return (
    <Text size="caption" tone="muted" aria-live="polite">
      {`${format.number(total)} ${total === 1 ? 'record' : 'records'}`}
    </Text>
  );
}
