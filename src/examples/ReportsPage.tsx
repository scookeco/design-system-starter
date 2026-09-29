/**
 * GOLDEN EXAMPLE: reports (charts over the workspace's data). A report answers one question per
 * chart, says the answer in words, and gives the exact numbers as a table. No chart library: the
 * charts (charts.tsx) are small SVGs drawn from the chart tokens. No CSS file, no className, no style.
 *
 * Anatomy:
 *   shell    Reports is the current nav item
 *   header   PageHeader: title + what's counted | the renewals horizon (SegmentedControl, in the URL)
 *   charts   a column of Cards, one question each (full width, so every table fits); the card's description is the takeaway, the chart's
 *            accessible name says it too, and "Show the numbers" opens its table
 *              Records by status          parts of a whole: a stacked bar and a legend with values
 *              Contract value by account  the top accounts and "Other": bars in one colour
 *              Renewals by month          values over time: columns in one colour, gridlines
 *
 * The server aggregates (src/app/mocks/reports.ts) over what this person may see, so a viewer's
 * report has no drafts. Loading, error and a workspace with nothing to report are here.
 */
import { Banner, Button, Card, CardBody, CardHeader, Center, EmptyState, Link, PageHeader, SegmentedControl, Skeleton, Stack, useFormat, type Formatter } from '../index';
import { REPORT_HORIZONS, type Report, type ReportHorizon } from '../app/api/reports';
import { useAccounts } from '../app/model/queries';
import { useReport } from '../app/model/reports';
import { STATUS } from '../app/model/status';
import type { UrlCodec } from '../app/url/useUrlState';
import { useUrlState } from '../app/url/useUrlState';
import { BarChart, ChartNumbers, ColumnChart, StackedBarChart, type ChartDatum } from './charts';
import { ExampleShell } from './ExampleShell';

/** The renewals horizon, in the URL: /reports?horizon=12. Anything else is the default, 6. */
export const reportsCodec: UrlCodec<{ horizon: ReportHorizon }> = {
  parse: (search) => ({ horizon: new URLSearchParams(search).get('horizon') === '12' ? 12 : 6 }),
  serialise: (state) => (state.horizon === 6 ? '' : `horizon=${String(state.horizon)}`),
};

const HORIZONS = REPORT_HORIZONS.map((h) => ({ value: String(h), label: `Next ${String(h)} months` }));

export interface ReportsPageProps {
  /** Open every chart's table (gallery and tests). */
  initialNumbersOpen?: boolean;
}

export function ReportsPage({ initialNumbersOpen = false }: ReportsPageProps) {
  const [url, nav] = useUrlState(reportsCodec);
  return (
    <ExampleShell current="/reports">
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          <PageHeader
            title="Reports"
            description="Every record that isn’t archived, as of today, in the workspace’s currency."
            actions={
              <SegmentedControl
                label="Renewals horizon"
                hideLabel
                options={HORIZONS}
                value={String(url.horizon)}
                onValueChange={(value) => nav.replace({ horizon: value === '12' ? 12 : 6 })}
              />
            }
          />
          <ReportBody horizon={url.horizon} numbersOpen={initialNumbersOpen} />
        </Stack>
      </Center>
    </ExampleShell>
  );
}

const money = (format: Formatter, m: { minor: number; currency: string }, compact = true) => format.money(m.minor, m.currency, { compact });

function ReportBody({ horizon, numbersOpen }: { horizon: ReportHorizon; numbersOpen: boolean }) {
  const report = useReport(horizon);
  const accounts = useAccounts();

  if (report.isPending) {
    return (
      <Stack gap="lg">
        <Skeleton shape="block" />
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </Stack>
    );
  }
  if (report.isError) {
    return (
      <Banner
        tone="danger"
        title="Reports didn’t load"
        action={
          <Button variant="secondary" onClick={() => void report.refetch()}>
            Try again
          </Button>
        }
      >
        Check your connection and try again.
      </Banner>
    );
  }
  const data = report.data;
  const total = data.byStatus.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) {
    return (
      <EmptyState
        reason="first-use"
        title="Nothing to report yet"
        description="Reports count the records in this workspace. Create some, or import a spreadsheet of them."
        action={<Link href="/import/records">Import records</Link>}
        headingLevel={2}
      />
    );
  }
  const accountName = (id: string) => accounts.data?.find((a) => a.id === id)?.name ?? '…';
  return (
    <Stack gap="lg">
      <StatusCard report={data} numbersOpen={numbersOpen} />
      <AccountsCard report={data} accountName={accountName} numbersOpen={numbersOpen} />
      <RenewalsCard report={data} numbersOpen={numbersOpen} />
    </Stack>
  );
}

function StatusCard({ report, numbersOpen }: { report: Report; numbersOpen: boolean }) {
  const format = useFormat();
  const total = report.byStatus.reduce((sum, s) => sum + s.count, 0);
  const data: ChartDatum[] = report.byStatus.map((s) => ({ key: s.status, label: STATUS[s.status].label, value: s.count, display: format.number(s.count) }));
  const largest = [...data].sort((a, b) => b.value - a.value)[0];
  const takeaway = largest ? `${largest.label} is the largest share: ${largest.display} of ${format.number(total)} records (${format.percent(largest.value / total, { maximumFractionDigits: 0 })}).` : '';
  return (
    <Card>
      <CardHeader title="Records by status" description={takeaway} />
      <CardBody>
        <Stack gap="md">
          <StackedBarChart label={`Records by status. ${takeaway}`} data={data} share={(f) => format.percent(f, { maximumFractionDigits: 0 })} />
          <ChartNumbers
            caption="Records by status"
            columns={['Status', { label: 'Records', numeric: true }, { label: 'Share', numeric: true }]}
            rows={data.map((d) => ({ key: d.label, cells: [d.label, d.display, format.percent(d.value / total, { maximumFractionDigits: 1 })] }))}
            defaultOpen={numbersOpen}
          />
        </Stack>
      </CardBody>
    </Card>
  );
}

function AccountsCard({ report, accountName, numbersOpen }: { report: Report; accountName: (id: string) => string; numbersOpen: boolean }) {
  const format = useFormat();
  const top6 = report.byAccount.map((a) => ({ key: a.accountId, label: accountName(a.accountId), value: a.value, records: a.records }));
  // The chart compares the named accounts; the rest are one row in the table, not a bar that dwarfs them.
  const rows = [
    ...top6,
    ...(report.otherAccounts.accounts > 0
      ? [{ key: 'other', label: `Other (${format.number(report.otherAccounts.accounts)} accounts)`, value: report.otherAccounts.value, records: report.otherAccounts.records }]
      : []),
  ];
  const data: ChartDatum[] = top6.map((r) => ({ key: r.key, label: r.label, value: r.value.minor, display: money(format, r.value) }));
  const top = top6[0];
  const takeaway = top ? `${top.label} holds the most contract value: ${money(format, top.value)} across ${format.number(top.records)} records.` : 'No records belong to an account yet.';
  return (
    <Card>
      <CardHeader title="Contract value by account" description={takeaway} />
      <CardBody>
        <Stack gap="md">
          <BarChart label={`Contract value by account. ${takeaway}`} data={data} />
          <ChartNumbers
            caption="Contract value by account"
            columns={['Account', { label: 'Records', numeric: true }, { label: 'Contract value', numeric: true }]}
            rows={rows.map((r) => ({ key: r.key, cells: [r.label, format.number(r.records), money(format, r.value, false)] }))}
            defaultOpen={numbersOpen}
          />
        </Stack>
      </CardBody>
    </Card>
  );
}

function RenewalsCard({ report, numbersOpen }: { report: Report; numbersOpen: boolean }) {
  const format = useFormat();
  const month = (m: string) => format.date(`${m}-01`, 'month');
  const data: ChartDatum[] = report.renewals.map((r) => ({ key: r.month, label: month(r.month), value: r.value.minor, display: money(format, r.value) }));
  const busiest = [...report.renewals].sort((a, b) => b.value.minor - a.value.minor)[0];
  const max = busiest?.value;
  const takeaway = busiest
    ? `Busiest month: ${month(busiest.month)}, ${money(format, busiest.value)} across ${format.number(busiest.count)} renewals.`
    : 'Nothing renews in this period.';
  const first = report.renewals[0];
  const last = report.renewals.at(-1);
  return (
    <Card>
      <CardHeader title="Renewals by month" description={takeaway} />
      <CardBody>
        <Stack gap="md">
          <ColumnChart
            label={`Renewals by month, ${month(first?.month ?? '')} to ${month(last?.month ?? '')}. ${takeaway}`}
            data={data}
            top={max ? `Contract value renewing, up to ${money(format, max)}` : 'Contract value renewing'}
            first={month(first?.month ?? '')}
            last={month(last?.month ?? '')}
          />
          <ChartNumbers
            caption="Renewals by month"
            columns={['Month', { label: 'Renewals', numeric: true }, { label: 'Contract value', numeric: true }]}
            rows={report.renewals.map((r) => ({ key: r.month, cells: [month(r.month), format.number(r.count), money(format, r.value, false)] }))}
            defaultOpen={numbersOpen}
          />
        </Stack>
      </CardBody>
    </Card>
  );
}
