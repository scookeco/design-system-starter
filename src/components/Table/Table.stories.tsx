import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useFormat } from '../../format/LocaleProvider';
import { Badge } from '../Badge/Badge';
import { Checkbox } from '../Checkbox/Checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, type SortDirection } from './Table';

const rows = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  name: `Record ${String(i + 1).padStart(2, '0')}`,
  owner: ['Finance', 'Legal', 'Operations'][i % 3] ?? 'Finance',
  /** Money in minor units (cents), formatted at render for the toolbar's locale. */
  amount: ((i * 7919) % 100000) * 10,
  overdue: i % 5 === 0,
}));

/** In `windowed`, these rows stand for rows 101–114 of a 5,000-row table whose other rows aren't rendered. */
const WINDOW_START = 100;
const WINDOW_TOTAL = 5000;

function RecordsTable({ direction = 'ascending', maxHeight, selectable = false, windowed = false }: { direction?: SortDirection; maxHeight?: 'sm'; selectable?: boolean; windowed?: boolean }) {
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set(selectable ? [2, 3] : []));
  const toggle = (id: number, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const format = useFormat();
  const [sort, setSort] = useState<SortDirection>(direction);
  const sorted = [...rows].sort((a, b) => (a.amount - b.amount) * (sort === 'ascending' ? 1 : -1));
  return (
    <Table caption="Records by amount" maxHeight={maxHeight} {...(windowed ? { rowCount: WINDOW_TOTAL + 1 } : {})}>
      <TableHead>
        <TableRow {...(windowed ? { 'aria-rowindex': 1 } : {})}>
          {selectable ? (
            <TableHeaderCell>
              <Checkbox
                label="Select all rows"
                hideLabel
                checked={selected.size === rows.length ? true : selected.size > 0 ? 'indeterminate' : false}
                onCheckedChange={(checked) => setSelected(new Set(checked === true ? rows.map((r) => r.id) : []))}
              />
            </TableHeaderCell>
          ) : null}
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell numeric sort={sort} onSort={() => setSort(sort === 'ascending' ? 'descending' : 'ascending')}>
            Amount
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row, index) => (
          <TableRow key={row.id} selected={selected.has(row.id)} {...(windowed ? { 'aria-rowindex': WINDOW_START + index + 2 } : {})}>
            {selectable ? (
              <TableCell>
                <Checkbox label={`Select ${row.name}`} hideLabel checked={selected.has(row.id)} onCheckedChange={(checked) => toggle(row.id, checked === true)} />
              </TableCell>
            ) : null}
            <TableCell rowHeader>{row.name}</TableCell>
            <TableCell>{row.owner}</TableCell>
            <TableCell>{row.overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone="success">Active</Badge>}</TableCell>
            <TableCell numeric>{format.money(row.amount, 'USD')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const meta = {
  title: 'Components/Table',
  component: RecordsTable,
} satisfies Meta<typeof RecordsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SortedAscending: Story = {};
export const SortedDescending: Story = { args: { direction: 'descending' } };
export const StickyHeader: Story = { args: { maxHeight: 'sm' } };
/** Row checkboxes named after their row; selected rows are filled. The header checkbox is indeterminate for a partial selection. */
export const Selectable: Story = { args: { selectable: true } };
/**
 * A window onto a much longer table (the List page's Scroll display renders only the rows in view):
 * `rowCount` sets aria-rowcount to all 5,001 rows, and each rendered row carries its aria-rowindex,
 * so a screen reader says where in the whole table a row is. It looks like any other table.
 */
export const WindowedRows: Story = { args: { windowed: true } };
