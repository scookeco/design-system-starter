import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from '../Table/Table';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};
export const SingleLine: Story = { args: { lines: 1 } };
export const Block: Story = { args: { shape: 'block' } };
export const TableRows: Story = {
  render: () => (
    <Table caption="Records (loading)">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <Skeleton shape="table-row" columns={4} />
        <Skeleton shape="table-row" columns={4} />
        <Skeleton shape="table-row" columns={4} />
      </TableBody>
    </Table>
  ),
};
