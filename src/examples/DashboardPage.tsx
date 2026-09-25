/**
 * GOLDEN EXAMPLE: the dashboard archetype (a home or overview page).
 *
 * A dashboard answers "how are things, and what needs me?" in that order. No charts here: when a
 * trend needs one, it goes in a Card like any other section. No CSS file, no className, no style.
 *
 * Anatomy:
 *   shell    the Home nav item is current · no breadcrumb (a top-level page)
 *   header   PageHeader: title + one line | the date range (SegmentedControl) as the page's control
 *   stats    Switcher of Stat tiles: one row, or one column when narrow, never a ragged wrap
 *   body     Grid of cards: recent activity · usage against plan limits (Meter)
 *   work     a table of what needs attention, each row linking to its record
 *
 * Every number follows the date range; the usage meters don't (limits are per billing month).
 */
import { useState } from 'react';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Center,
  Cluster,
  Grid,
  Link,
  Meter,
  PageHeader,
  SegmentedControl,
  Stack,
  Stat,
  Switcher,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  useFormat,
  type Formatter,
  type StatDelta,
} from '../index';
import { ExampleShell } from './ExampleShell';
import { SAMPLE_RECORDS, STATUS } from './records';

export type DateRange = '7d' | '30d' | '90d';

const RANGES: readonly { value: DateRange; label: string; comparison: string }[] = [
  { value: '7d', label: '7 days', comparison: 'vs previous 7 days' },
  { value: '30d', label: '30 days', comparison: 'vs previous 30 days' },
  { value: '90d', label: '90 days', comparison: 'vs previous 90 days' },
];

/** How a stat's number reads: a count, or money in the workspace's currency. */
type StatKind = 'count' | 'money';

interface StatData {
  label: string;
  kind: StatKind;
  /** A count, or money in minor units. */
  value: number;
  /** The change: a ratio (0.09 = 9%) or, for counts, an absolute number. */
  delta: { by: 'ratio' | 'count'; value: number; direction: StatDelta['direction']; tone?: StatDelta['tone'] };
}

/** Stats per range, as numbers. A real page derives these from its query; formatting happens at render. */
const STATS: Record<DateRange, readonly StatData[]> = {
  '7d': [
    { label: 'Records created', kind: 'count', value: 24, delta: { by: 'ratio', value: 0.09, direction: 'up', tone: 'positive' } },
    { label: 'Pending approvals', kind: 'count', value: 9, delta: { by: 'count', value: 2, direction: 'down', tone: 'positive' } },
    { label: 'Overdue records', kind: 'count', value: 3, delta: { by: 'count', value: 1, direction: 'up', tone: 'negative' } },
    { label: 'Contract value', kind: 'money', value: 18_200_000, delta: { by: 'ratio', value: 0, direction: 'flat' } },
  ],
  '30d': [
    { label: 'Records created', kind: 'count', value: 86, delta: { by: 'ratio', value: 0.12, direction: 'up', tone: 'positive' } },
    { label: 'Pending approvals', kind: 'count', value: 9, delta: { by: 'ratio', value: 0.25, direction: 'down', tone: 'positive' } },
    { label: 'Overdue records', kind: 'count', value: 14, delta: { by: 'count', value: 3, direction: 'up', tone: 'negative' } },
    { label: 'Contract value', kind: 'money', value: 120_000_000, delta: { by: 'ratio', value: 0.04, direction: 'down', tone: 'neutral' } },
  ],
  '90d': [
    { label: 'Records created', kind: 'count', value: 241, delta: { by: 'ratio', value: 0.06, direction: 'up', tone: 'positive' } },
    { label: 'Pending approvals', kind: 'count', value: 9, delta: { by: 'ratio', value: 0.1, direction: 'down', tone: 'positive' } },
    { label: 'Overdue records', kind: 'count', value: 31, delta: { by: 'ratio', value: 0.08, direction: 'down', tone: 'positive' } },
    { label: 'Contract value', kind: 'money', value: 340_000_000, delta: { by: 'ratio', value: 0.11, direction: 'up', tone: 'positive' } },
  ],
};

/** The workspace's billing currency. Formatted in the reader's locale; the two are separate settings. */
const CURRENCY = 'USD';

const ACTIVITY = [
  { id: 'a-1', who: 'Priya Natarajan', what: 'approved Hardware lease', when: '2026-09-24T15:20:00Z' },
  { id: 'a-2', who: 'Sam Rivera', what: 'created Event venue', when: '2026-09-23T10:05:00Z' },
  { id: 'a-3', who: 'Jo Okafor', what: 'commented on Consulting retainer', when: '2026-09-22T08:40:00Z' },
];

const attention = SAMPLE_RECORDS.filter((r) => r.status === 'overdue' || r.status === 'pending');

const statValue = (stat: StatData, format: Formatter) =>
  stat.kind === 'money' ? format.money(stat.value, CURRENCY, { compact: true }) : format.number(stat.value);

const statDelta = (stat: StatData, format: Formatter): StatDelta => ({
  value: stat.delta.by === 'ratio' ? format.percent(stat.delta.value) : format.number(stat.delta.value),
  direction: stat.delta.direction,
  ...(stat.delta.tone ? { tone: stat.delta.tone } : {}),
});

export interface DashboardPageProps {
  initialRange?: DateRange;
}

export function DashboardPage({ initialRange = '30d' }: DashboardPageProps) {
  const format = useFormat();
  const [range, setRange] = useState<DateRange>(initialRange);
  const comparison = RANGES.find((r) => r.value === range)?.comparison;

  return (
    <ExampleShell current="/home">
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          <PageHeader
            title="Home"
            description="How the workspace is doing, and what needs you."
            actions={
              <SegmentedControl
                label="Date range"
                hideLabel
                options={RANGES}
                value={range}
                onValueChange={(value) => setRange(value as DateRange)}
              />
            }
          />

          <Switcher as="section" aria-label="Key numbers" threshold="sm" gap="md">
            {STATS[range].map((stat) => (
              <Stat key={stat.label} label={stat.label} value={statValue(stat, format)} delta={statDelta(stat, format)} comparison={comparison} />
            ))}
          </Switcher>

          <Grid min="lg" gap="lg">
            <Card>
              <CardHeader title="Recent activity" />
              <CardBody>
                <Stack as="ol" role="list" gap="md">
                  {ACTIVITY.map((item) => (
                    <Cluster as="li" key={item.id} gap="sm" align="start" wrap={false}>
                      <Avatar name={item.who} size="sm" decorative />
                      <Stack gap="2xs">
                        <Text>{`${item.who} ${item.what}`}</Text>
                        <Text size="caption" tone="muted" numeric>
                          {format.relative(item.when)}
                        </Text>
                      </Stack>
                    </Cluster>
                  ))}
                </Stack>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Usage this month" description="Against the Team plan’s limits." />
              <CardBody>
                <Meter label="Seats" value={42} max={50} valueText={`${format.number(42)} of ${format.number(50)} seats`} />
                <Meter label="Storage" value={18} max={100} valueText={`${format.fileSize(18_000_000_000)} of ${format.fileSize(100_000_000_000)}`} />
                <Meter label="API calls" value={10000} max={10000} valueText={`${format.number(10000)} of ${format.number(10000)} calls`} />
              </CardBody>
            </Card>
          </Grid>

          <Table caption="Needs attention">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Record</TableHeaderCell>
                <TableHeaderCell>Owner</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell numeric>Amount</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attention.map((row) => (
                <TableRow key={row.id}>
                  <TableCell rowHeader>
                    <Link href={`/records/${row.id}`}>{row.name}</Link>
                  </TableCell>
                  <TableCell>{row.owner}</TableCell>
                  <TableCell>
                    <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
                  </TableCell>
                  <TableCell numeric>{format.money(row.amount.minor, row.amount.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </Center>
    </ExampleShell>
  );
}
