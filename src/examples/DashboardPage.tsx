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

/** Stats per range. A real page derives these from its query. */
const STATS: Record<DateRange, readonly { label: string; value: string; delta: StatDelta }[]> = {
  '7d': [
    { label: 'Records created', value: '24', delta: { value: '9%', direction: 'up', tone: 'positive' } },
    { label: 'Pending approvals', value: '9', delta: { value: '2', direction: 'down', tone: 'positive' } },
    { label: 'Overdue records', value: '3', delta: { value: '1', direction: 'up', tone: 'negative' } },
    { label: 'Contract value', value: '$182K', delta: { value: '0%', direction: 'flat' } },
  ],
  '30d': [
    { label: 'Records created', value: '86', delta: { value: '12%', direction: 'up', tone: 'positive' } },
    { label: 'Pending approvals', value: '9', delta: { value: '25%', direction: 'down', tone: 'positive' } },
    { label: 'Overdue records', value: '14', delta: { value: '3', direction: 'up', tone: 'negative' } },
    { label: 'Contract value', value: '$1.2M', delta: { value: '4%', direction: 'down', tone: 'neutral' } },
  ],
  '90d': [
    { label: 'Records created', value: '241', delta: { value: '6%', direction: 'up', tone: 'positive' } },
    { label: 'Pending approvals', value: '9', delta: { value: '10%', direction: 'down', tone: 'positive' } },
    { label: 'Overdue records', value: '31', delta: { value: '8%', direction: 'down', tone: 'positive' } },
    { label: 'Contract value', value: '$3.4M', delta: { value: '11%', direction: 'up', tone: 'positive' } },
  ],
};

const ACTIVITY = [
  { id: 'a-1', who: 'Priya Natarajan', what: 'approved Hardware lease', when: '2026-09-24' },
  { id: 'a-2', who: 'Sam Rivera', what: 'created Event venue', when: '2026-09-23' },
  { id: 'a-3', who: 'Jo Okafor', what: 'commented on Consulting retainer', when: '2026-09-22' },
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const attention = SAMPLE_RECORDS.filter((r) => r.status === 'overdue' || r.status === 'pending');

export interface DashboardPageProps {
  initialRange?: DateRange;
}

export function DashboardPage({ initialRange = '30d' }: DashboardPageProps) {
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
              <Stat key={stat.label} label={stat.label} value={stat.value} delta={stat.delta} comparison={comparison} />
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
                          {item.when}
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
                <Meter label="Seats" value={42} max={50} valueText="42 of 50 seats" />
                <Meter label="Storage" value={18} max={100} valueText="18 of 100 GB" />
                <Meter label="API calls" value={10000} max={10000} valueText="10,000 of 10,000 calls" />
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
                  <TableCell numeric>{currency.format(row.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </Center>
    </ExampleShell>
  );
}
