import { Badge, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../src/index';
import type { UsageDoc } from './types';

const ROWS = [
  { name: 'Hardware lease', status: 'Approved', amount: '12,500.00' },
  { name: 'Office cleaning', status: 'Pending', amount: '860.00' },
];

export const usage: UsageDoc = {
  covers: [Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell],
  whenToUse: [
    'Records people compare across the same attributes: the default for a list page.',
    'Numbers right-aligned with `numeric`; the first cell of each row is its `rowHeader`.',
  ],
  whenNotToUse: [
    { situation: 'Items that are mostly visual or have fewer than four attributes worth comparing', instead: 'cards in a `Grid`' },
    { situation: 'Laying out a form or a page', instead: 'layout primitives' },
    { situation: 'A single record’s properties', instead: 'a definition list: `Stack as="dl"` with `Text as="dt"/"dd"`' },
  ],
  do: {
    caption: 'A caption names the table, the first cell heads the row, amounts line up on the right.',
    render: () => (
      <Table caption="Records" hideCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell numeric>Amount</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((r) => (
            <TableRow key={r.name}>
              <TableCell rowHeader>{r.name}</TableCell>
              <TableCell>
                <Badge tone={r.status === 'Approved' ? 'success' : 'warning'}>{r.status}</Badge>
              </TableCell>
              <TableCell numeric>{r.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),
  },
  dont: {
    caption: 'A table used to lay out a form: the grid means nothing, and screen readers announce rows and columns that aren’t there.',
    render: () => (
      <Table caption="Profile" hideCaption>
        <TableBody>
          <TableRow>
            <TableCell rowHeader>Name</TableCell>
            <TableCell>Sam Rivera</TableCell>
            <TableCell rowHeader>Role</TableCell>
            <TableCell>Owner</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  accessibility: [
    '`caption` is required and names the scroll region; `hideCaption` keeps it for screen readers only.',
    'Sortable headers are buttons, and the sorted column carries `aria-sort`.',
    'The scroll container is focusable, so keyboard users can scroll a wide or capped table.',
  ],
};
