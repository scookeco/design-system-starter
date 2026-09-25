import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../Badge/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, type SortDirection } from './Table';

const rows = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  name: `Record ${String(i + 1).padStart(2, '0')}`,
  owner: ['Finance', 'Legal', 'Operations'][i % 3] ?? 'Finance',
  amount: ((i * 7919) % 100000) / 10,
  overdue: i % 5 === 0,
}));

function RecordsTable({ direction = 'ascending', maxHeight }: { direction?: SortDirection; maxHeight?: 'sm' }) {
  const [sort, setSort] = useState<SortDirection>(direction);
  const sorted = [...rows].sort((a, b) => (a.amount - b.amount) * (sort === 'ascending' ? 1 : -1));
  return (
    <Table caption="Records by amount" maxHeight={maxHeight}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell numeric sort={sort} onSort={() => setSort(sort === 'ascending' ? 'descending' : 'ascending')}>
            Amount
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.id}>
            <TableCell rowHeader>{row.name}</TableCell>
            <TableCell>{row.owner}</TableCell>
            <TableCell>{row.overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone="success">Active</Badge>}</TableCell>
            <TableCell numeric>{row.amount.toFixed(2)}</TableCell>
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
