/**
 * GOLDEN EXAMPLE: billing and usage (customer-facing). The plan, what the workspace has used this
 * period against the plan's limits, its invoices, and a change-plan dialog. Money is integer minor
 * units with a currency code, formatted with useFormat(); no amount is ever built by hand.
 * No CSS file, no className, no style.
 *
 * Anatomy:
 *   shell    Settings is the current nav item; breadcrumb Settings / Billing and usage
 *   header   PageHeader: the plan and when the period ends | Change plan (disabled with the reason
 *            for anyone who can't change it)
 *   plan     a Card: the price per month and the next invoice
 *   usage    a Card of Meters, one per limit, each saying its numbers in words; nearing a limit and
 *            at the limit are said in words too (Meter's statuses), never by colour alone
 *   invoices a Table: number, date, amount, status
 *   change   a Dialog with the plans as a RadioGroup: each with its price and limits; a plan that
 *            can't hold what's in use is disabled with the reason (the rule the server applies).
 *            The switch is pessimistic and versioned: the dialog stays open, pending, until the
 *            server answers, and a refusal is shown in it.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Cluster,
  Dialog,
  Meter,
  PageHeader,
  RadioGroup,
  Skeleton,
  Stack,
  Switcher,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  useFormat,
  useToast,
  type BadgeTone,
  type Formatter,
} from '../index';
import { USAGE_METRICS, type Billing, type Invoice, type Plan, type UsageMetric } from '../app/api/billing';
import { ApiError } from '../app/api/client';
import { useBilling, useChangePlan, usePlans } from '../app/model/billing';
import { METRIC_LABEL, planMisfit } from '../app/model/billingRules';
import { usePermission } from '../app/session';
import { ExampleShell } from './ExampleShell';
import { gated, PermissionNote } from './Permission';

const INVOICE_STATUS: Record<Invoice['status'], { label: string; tone: BadgeTone }> = {
  paid: { label: 'Paid', tone: 'success' },
  open: { label: 'Due', tone: 'info' },
  void: { label: 'Void', tone: 'neutral' },
};

/** A metric's value as a person reads it: a count, or a size for storage. */
const amount = (format: Formatter) => (metric: UsageMetric, value: number) =>
  METRIC_LABEL[metric].unit(metric === 'storage' ? format.fileSize(value) : format.number(value));

/** The day after a calendar date: when the next period (and its invoice) starts. */
const nextDay = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 24 * 3600 * 1000).toISOString().slice(0, 10);

export interface BillingPageProps {
  /** Open the change-plan dialog (gallery and tests). */
  initialDialogOpen?: boolean;
  /** The plan chosen in it. */
  initialPlan?: string;
  /** Submit the choice on open (gallery and tests: a pending or refused switch). */
  initialSubmit?: boolean;
}

export function BillingPage(props: BillingPageProps) {
  return (
    <ExampleShell current="/settings" trail={{ items: [{ label: 'Settings', href: '/settings' }], current: 'Billing and usage' }}>
      <Center max="lg" gutters="lg">
        <BillingContent {...props} />
      </Center>
    </ExampleShell>
  );
}

function BillingContent({ initialDialogOpen = false, initialPlan, initialSubmit = false }: BillingPageProps) {
  const format = useFormat();
  const billing = useBilling();
  const plans = usePlans();
  const permission = usePermission('workspace:manage');
  const [open, setOpen] = useState(initialDialogOpen);
  const plan = plans.data?.find((p) => p.id === billing.data?.planId);

  const header = (
    <PageHeader
      title="Billing and usage"
      description={billing.data && plan ? `${plan.name} plan. This period ends on ${format.date(billing.data.period.end)}.` : 'Your plan, what you’ve used and your invoices.'}
      actions={
        <Stack gap="2xs" align="end">
          <Button onClick={() => setOpen(true)} {...gated(permission)}>
            Change plan
          </Button>
          <PermissionNote permission={permission} />
        </Stack>
      }
    />
  );

  if (billing.isPending || plans.isPending) {
    return (
      <Stack gap="lg">
        {header}
        <Skeleton shape="block" />
        <Skeleton shape="table-row" lines={6} columns={4} />
      </Stack>
    );
  }
  if (billing.isError || plans.isError) {
    return (
      <Stack gap="lg">
        {header}
        <Banner
          tone="danger"
          title="Billing didn’t load"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void billing.refetch();
                void plans.refetch();
              }}
            >
              Try again
            </Button>
          }
        >
          Check your connection and try again. Nothing about your plan has changed.
        </Banner>
      </Stack>
    );
  }
  const data = billing.data;
  const next = nextDay(data.period.end);
  return (
    <Stack gap="lg">
      {header}
      <Switcher threshold="sm" gap="lg">
        <Card>
          <CardHeader title="Plan" description={plan?.description} />
          <CardBody>
            <Stack gap="xs">
              <Text size="body-lg">{plan ? `${plan.name}, ${format.money(plan.price.minor, plan.price.currency)} a month` : 'Unknown plan'}</Text>
              <Text size="caption" tone="muted">
                {plan ? `Your next invoice, on ${format.date(next)}, is ${format.money(plan.price.minor, plan.price.currency)}.` : ''}
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Usage this period" description={`${format.date(data.period.start, 'short')} to ${format.date(data.period.end)}. Resets at the end of the period.`} />
          <CardBody>
            <Stack gap="sm">
              {USAGE_METRICS.map((metric) => (
                <Meter
                  key={metric}
                  label={METRIC_LABEL[metric].name}
                  value={data.usage[metric]}
                  max={plan?.limits[metric] ?? data.usage[metric]}
                  valueText={`${amount(format)(metric, data.usage[metric])} of ${amount(format)(metric, plan?.limits[metric] ?? 0)}`}
                />
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Switcher>
      <Table caption="Invoices">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Invoice</TableHeaderCell>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell numeric>Amount</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell rowHeader>{invoice.number}</TableCell>
              <TableCell>{format.date(invoice.issuedOn)}</TableCell>
              <TableCell numeric>{format.money(invoice.amount.minor, invoice.amount.currency)}</TableCell>
              <TableCell>
                <Badge tone={INVOICE_STATUS[invoice.status].tone}>{INVOICE_STATUS[invoice.status].label}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {permission.allowed && plans.data ? (
        <ChangePlanDialog open={open} onOpenChange={setOpen} billing={data} plans={plans.data} initialPlan={initialPlan} initialSubmit={initialSubmit} />
      ) : null}
    </Stack>
  );
}

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billing: Billing;
  plans: readonly Plan[];
  initialPlan: string | undefined;
  initialSubmit: boolean;
}

function ChangePlanDialog({ open, onOpenChange, billing, plans, initialPlan, initialSubmit }: ChangePlanDialogProps) {
  const format = useFormat();
  const toast = useToast();
  const change = useChangePlan();
  const [choice, setChoice] = useState(initialPlan ?? billing.planId);
  const [error, setError] = useState<string | undefined>();
  const chosen = plans.find((p) => p.id === choice);
  const formId = 'change-plan';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (choice === billing.planId) {
      setError(`You’re on ${chosen?.name ?? 'this plan'} already. Choose another plan.`);
      return;
    }
    setError(undefined);
    change.mutate(
      { planId: choice, version: billing.version },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast({ title: `You’re on ${chosen?.name ?? 'the new plan'} now`, description: chosen ? `Your next invoice is ${format.money(chosen.price.minor, chosen.price.currency)}.` : undefined, tone: 'success' });
        },
      },
    );
  };
  // A story or test can open the dialog mid-switch, once.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (!initialSubmit || !open || autoSubmitted.current || choice === billing.planId) return;
    autoSubmitted.current = true;
    change.mutate({ planId: choice, version: billing.version });
  }, [initialSubmit, open, choice, billing.planId, billing.version, change]);

  const options = plans.map((plan) => {
    const misfit = planMisfit(billing.usage, plan, amount(format));
    const price = `${format.money(plan.price.minor, plan.price.currency)} a month, up to ${format.number(plan.limits.seats)} seats`;
    return {
      value: plan.id,
      label: plan.id === billing.planId ? `${plan.name} (your plan)` : plan.name,
      description: misfit ? `${price}. ${misfit}` : `${price}. ${plan.description}`,
      disabled: misfit !== undefined,
    };
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          change.reset();
          setError(undefined);
        }
      }}
      title="Change plan"
      description="The new plan starts now. Your next invoice is for the new plan’s price."
      footer={
        <Cluster justify="end" gap="sm">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={change.isPending}>
            {chosen && choice !== billing.planId ? `Switch to ${chosen.name}` : 'Switch plan'}
          </Button>
        </Cluster>
      }
    >
      <Stack as="form" id={formId} gap="md" onSubmit={submit}>
        {change.isError ? (
          <Banner tone="danger" title="Your plan didn’t change">
            {change.error instanceof ApiError ? change.error.message : 'Check your connection and try again.'}
          </Banner>
        ) : null}
        <RadioGroup label="Plan" options={options} value={choice} onValueChange={setChoice} error={error} />
      </Stack>
    </Dialog>
  );
}
