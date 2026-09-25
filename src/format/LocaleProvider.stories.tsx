import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/Table/Table';
import { LocaleProvider, useFormat } from './LocaleProvider';

/** One fixed instant, so the samples never depend on when the gallery runs. */
const NOW = '2026-09-25T12:00:00Z';

function Samples() {
  const format = useFormat();
  const rows: [string, string, string][] = [
    ['Date', 'format.date(\'2026-09-12\')', format.date('2026-09-12')],
    ['Time', 'format.time(instant)', format.time('2026-09-25T09:30:00Z')],
    ['Date and time', 'format.dateTime(instant, { withZone: true })', format.dateTime('2026-09-25T09:30:00Z', { withZone: true })],
    ['Relative time', 'format.relative(instant, now)', format.relative('2026-09-22T12:00:00Z', NOW)],
    ['Number', 'format.number(1284.5)', format.number(1284.5)],
    ['Percent', 'format.percent(0.125)', format.percent(0.125)],
    ['Compact', 'format.compact(1_200_000)', format.compact(1_200_000)],
    ['Money', 'format.money(1_250_050, \'USD\')', format.money(1_250_050, 'USD')],
    ['Money, zero-decimal currency', 'format.money(150_000, \'JPY\')', format.money(150_000, 'JPY')],
    ['List', 'format.list([…])', format.list(['Legal', 'Finance', 'Sales'])],
    ['File size', 'format.fileSize(1_200_000)', format.fileSize(1_200_000)],
  ];
  return (
    <Table caption={`Formats for ${format.locale}, ${format.timeZone}`}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Format</TableHeaderCell>
          <TableHeaderCell>Call</TableHeaderCell>
          <TableHeaderCell numeric>Output</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(([name, call, output]) => (
          <TableRow key={name}>
            <TableCell rowHeader>{name}</TableCell>
            <TableCell>
              <code>{call}</code>
            </TableCell>
            <TableCell numeric>{output}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const meta = {
  title: 'Utilities/LocaleProvider',
  component: LocaleProvider,
  args: { locale: 'en-US', timeZone: 'UTC', children: <Samples /> },
} satisfies Meta<typeof LocaleProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EnglishUS: Story = {};
export const German: Story = { args: { locale: 'de-DE', timeZone: 'Europe/Berlin' } };
export const Japanese: Story = { args: { locale: 'ja-JP', timeZone: 'Asia/Tokyo' } };
export const ArabicEgypt: Story = { args: { locale: 'ar-EG', timeZone: 'Africa/Cairo' } };
