/**
 * The first-run checklist on the dashboard (customer-facing), composed from system components
 * (src/app/model/onboarding.ts). Only people who set the workspace up see it.
 *
 *   OnboardingChecklist   a Card: "Get started", Progress in words ("1 of 3 done"), each step either
 *                         done (a Done badge) or a link to where it's done; Dismiss, with Undo
 *   OnboardingRestore     after a dismiss, a quiet way back at the bottom of Home (what the Undo
 *                         toast's altText points to)
 *
 * The steps are worked out on the server from the workspace itself (a member invited, an import
 * that brought records in, a connected app), so the checklist can't say a step is done that isn't.
 * A checklist that fails to load stays out of the way: Home still works.
 */
import { Badge, Button, Card, CardBody, CardHeader, Cluster, Link, Progress, Skeleton, Stack, Text, useFormat, useToast } from '../index';
import type { OnboardingStep } from '../app/api/onboarding';
import { useDismissOnboarding, useOnboarding, useRestoreOnboarding } from '../app/model/onboarding';

const STEPS: Record<OnboardingStep, { title: string; description: string; href: string }> = {
  invite: { title: 'Invite your team', description: 'Records are clearer with owners. Invite people and choose what each can do.', href: '/admin/members?invite=1' },
  import: { title: 'Import your records', description: 'Bring in a spreadsheet: a CSV of up to 1,000 rows.', href: '/import/records' },
  connect: { title: 'Connect an app', description: 'Post approvals to chat, put renewals on a calendar, or sync your CRM.', href: '/integrations' },
};

const RESTORE_LABEL = 'Show the setup checklist';

export function OnboardingChecklist() {
  const format = useFormat();
  const toast = useToast();
  const onboarding = useOnboarding();
  const dismiss = useDismissOnboarding();
  const restore = useRestoreOnboarding();
  if (onboarding.fetchStatus === 'idle' && onboarding.isPending) return null;
  if (onboarding.isPending) return <Skeleton shape="block" />;
  if (onboarding.isError || onboarding.data.dismissed) return null;
  const { steps } = onboarding.data;
  const done = steps.filter((s) => s.done).length;
  const finished = done === steps.length;
  return (
    <Card>
      <CardHeader
        title={finished ? 'You’re all set' : 'Get started'}
        description={finished ? 'Every setup step is done. Dismiss this whenever you like.' : 'A few things that make this workspace yours.'}
        actions={
          <Button
            variant="ghost"
            size="sm"
            loading={dismiss.isPending}
            onClick={() =>
              dismiss.mutate(undefined, {
                onSuccess: () =>
                  toast({
                    title: 'Setup checklist hidden',
                    tone: 'success',
                    action: { label: 'Undo', altText: `Bring it back with ${RESTORE_LABEL}, at the bottom of Home.`, onAction: () => restore.mutate() },
                  }),
                onError: () => toast({ title: 'Couldn’t hide the checklist', description: 'Try again.', tone: 'danger', duration: Infinity }),
              })
            }
          >
            Dismiss
          </Button>
        }
      />
      <CardBody>
        <Stack gap="md">
          <Progress label="Setup" value={done} max={steps.length} valueText={`${format.number(done)} of ${format.number(steps.length)} done`} />
          <Stack as="ol" role="list" gap="md">
            {steps.map((step) => (
              <Cluster as="li" key={step.id} justify="between" align="start" gap="sm">
                <Stack gap="2xs">
                  {step.done ? <Text>{STEPS[step.id].title}</Text> : <Link href={STEPS[step.id].href}>{STEPS[step.id].title}</Link>}
                  <Text size="caption" tone="muted">
                    {STEPS[step.id].description}
                  </Text>
                </Stack>
                {step.done ? (
                  <Badge tone="success">Done</Badge>
                ) : (
                  <Badge tone="neutral" indicator="none">
                    To do
                  </Badge>
                )}
              </Cluster>
            ))}
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}

/** Once dismissed: the way back, at the bottom of Home. Nothing otherwise. */
export function OnboardingRestore() {
  const onboarding = useOnboarding();
  const restore = useRestoreOnboarding();
  if (!onboarding.data?.dismissed) return null;
  return (
    <Cluster>
      <Button variant="ghost" size="sm" loading={restore.isPending} onClick={() => restore.mutate()}>
        {RESTORE_LABEL}
      </Button>
    </Cluster>
  );
}
