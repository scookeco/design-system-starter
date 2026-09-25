/**
 * GOLDEN EXAMPLE: the wizard archetype (setup, or a create flow that genuinely has ordered steps).
 *
 * Use it only when later steps depend on earlier ones. A form whose sections can be filled in any
 * order is a single page (CreateEditFlow). No CSS file, no className, no style.
 *
 * Anatomy:
 *   frame    FocusedLayout: brand · the task · Exit setup | Progress (Step n of 4) | column | Back · Next
 *   column   Stepper (completed · current · upcoming) · PageHeader (the step's h1) · the step's form
 *   steps    Workspace → Invite (optional) → Plan → Review (every answer, each with Edit) → Create
 *
 * Validation is per step: Next checks only this step. On failure, field errors show and focus moves to
 * the first invalid field; nothing typed is lost. On every step change, focus moves to the new
 * step's h1 so screen reader and keyboard users start at the top of the new step.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  Cluster,
  FocusedLayout,
  PageHeader,
  Progress,
  RadioGroup,
  Stack,
  Stepper,
  Text,
  TextField,
  Textarea,
} from '../index';

export interface WorkspaceDraft {
  name: string;
  address: string;
  invites: string;
  plan: string;
}

type Field = keyof WorkspaceDraft;

const STEPS = [
  { label: 'Workspace', title: 'Name your workspace', description: 'This is what your team sees when they sign in.' },
  { label: 'Invite', title: 'Invite your team', description: 'Optional. You can invite people later from Settings.' },
  { label: 'Plan', title: 'Choose a plan', description: 'Every plan starts with a 14-day trial. Change it any time.' },
  { label: 'Review', title: 'Review and create', description: 'Check your answers. You can change any of them later.' },
] as const;

/** Which fields each step owns, in form order: Next validates only these. */
const STEP_FIELDS: readonly (readonly Field[])[] = [['name', 'address'], ['invites'], ['plan'], []];

const FIELD_ID: Record<Field, string> = { name: 'workspace-name', address: 'workspace-address', invites: 'workspace-invites', plan: 'workspace-plan' };

const PLANS = [
  { value: 'starter', label: 'Starter', description: 'Up to 5 people. Core records and activity.' },
  { value: 'team', label: 'Team', description: 'Up to 50 people. Approvals, audit log and SSO.' },
  { value: 'enterprise', label: 'Enterprise', description: 'Unlimited people, data residency and a support plan.' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailsIn = (text: string) => text.split(/[\s,]+/).filter(Boolean);

const validate = (draft: WorkspaceDraft): Partial<Record<Field, string>> => {
  const errors: Partial<Record<Field, string>> = {};
  if (draft.name.trim() === '') errors.name = 'Enter a name for the workspace.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.address)) errors.address = 'Use lowercase letters, numbers and single hyphens, like acme-legal.';
  const bad = emailsIn(draft.invites).filter((email) => !EMAIL.test(email));
  if (bad.length > 0) errors.invites = `Check ${bad.length === 1 ? 'this address' : 'these addresses'}: ${bad.join(', ')}.`;
  if (draft.plan === '') errors.plan = 'Choose a plan to start your trial on.';
  return errors;
};

const EMPTY: WorkspaceDraft = { name: '', address: '', invites: '', plan: '' };

export interface SetupWizardProps {
  initialStep?: number;
  initialDraft?: Partial<WorkspaceDraft>;
  /** Render as if Next was just pressed on an invalid step (gallery and tests). */
  initialAttempted?: boolean;
}

export function SetupWizard({ initialStep = 0, initialDraft, initialAttempted = false }: SetupWizardProps) {
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState<WorkspaceDraft>({ ...EMPTY, ...initialDraft });
  const [attempted, setAttempted] = useState<readonly number[]>(initialAttempted ? [initialStep] : []);
  const [created, setCreated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Every step change starts the person at the new step's h1.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const errors = validate(draft);
  const shown = (field: Field) => (attempted.includes(step) ? errors[field] : undefined);
  const set = (field: Field, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const meta = STEPS[step] ?? STEPS[0];
  const last = step === STEPS.length - 1;

  const next = (event: FormEvent) => {
    event.preventDefault();
    if (last) {
      setCreated(true);
      return;
    }
    const invalid = (STEP_FIELDS[step] ?? []).filter((field) => errors[field]);
    if (invalid.length > 0) {
      setAttempted((current) => [...current, step]);
      const first = invalid[0];
      // Focus the first invalid field once its error is rendered.
      if (first) window.requestAnimationFrame(() => document.getElementById(FIELD_ID[first])?.focus());
      return;
    }
    setStep(step + 1);
  };

  const formId = 'setup-step';

  return (
    <FocusedLayout
      brand="Acme"
      task="Set up your workspace"
      exit={
        <Button variant="ghost" icon="close">
          Exit setup
        </Button>
      }
      progress={<Progress label="Setup progress" value={step + 1} max={STEPS.length} valueText={`Step ${String(step + 1)} of ${String(STEPS.length)}`} />}
      footer={
        created ? undefined : (
          <Cluster justify="between">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" form={formId}>
              {last ? 'Create workspace' : 'Next'}
            </Button>
          </Cluster>
        )
      }
    >
      <Stepper label="Setup steps" steps={STEPS} current={created ? STEPS.length : step} />
      <PageHeader title={created ? 'Your workspace is ready' : meta.title} description={created ? undefined : meta.description} headingRef={headingRef} />

      {created ? (
        <Stack gap="md" align="start">
          <Banner tone="success">{`${draft.name.trim()} was created. Invitations are on their way.`}</Banner>
          <Button>Go to your workspace</Button>
        </Stack>
      ) : (
        <Stack as="form" id={formId} gap="md" onSubmit={next}>
          {step === 0 ? (
            <>
              <TextField
                id={FIELD_ID.name}
                label="Workspace name"
                value={draft.name}
                onChange={(event) => set('name', event.target.value)}
                error={shown('name')}
                autoComplete="organization"
              />
              <TextField
                id={FIELD_ID.address}
                label="Workspace address"
                description="Lowercase letters, numbers and hyphens. Your team signs in at acme.app/<address>."
                value={draft.address}
                onChange={(event) => set('address', event.target.value)}
                error={shown('address')}
                autoComplete="off"
              />
            </>
          ) : null}
          {step === 1 ? (
            <Textarea
              id={FIELD_ID.invites}
              label="Email addresses (optional)"
              description="Separate addresses with commas or new lines."
              value={draft.invites}
              onChange={(event) => set('invites', event.target.value)}
              error={shown('invites')}
            />
          ) : null}
          {step === 2 ? (
            <RadioGroup id={FIELD_ID.plan} label="Plan" options={PLANS} value={draft.plan} onValueChange={(value) => set('plan', value)} error={shown('plan')} />
          ) : null}
          {step === 3 ? <Review draft={draft} onEdit={setStep} /> : null}
        </Stack>
      )}
    </FocusedLayout>
  );
}

function Review({ draft, onEdit }: { draft: WorkspaceDraft; onEdit: (step: number) => void }) {
  const invites = emailsIn(draft.invites);
  const sections = [
    { step: 0, title: 'Workspace', rows: [{ label: 'Name', value: draft.name }, { label: 'Address', value: `acme.app/${draft.address}` }] },
    { step: 1, title: 'Invitations', rows: [{ label: 'People', value: invites.length > 0 ? invites.join(', ') : 'Nobody yet' }] },
    { step: 2, title: 'Plan', rows: [{ label: 'Plan', value: PLANS.find((p) => p.value === draft.plan)?.label ?? 'Not chosen' }] },
  ];
  return (
    <Stack gap="md">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader
            title={section.title}
            actions={
              <Button variant="ghost" size="sm" onClick={() => onEdit(section.step)} aria-label={`Edit ${section.title.toLowerCase()}`}>
                Edit
              </Button>
            }
          />
          <CardBody>
            <Stack as="dl" gap="sm">
              {section.rows.map((row) => (
                <Stack gap="2xs" key={row.label}>
                  <Text as="dt" size="caption" tone="muted">
                    {row.label}
                  </Text>
                  <Text as="dd">{row.value}</Text>
                </Stack>
              ))}
            </Stack>
          </CardBody>
        </Card>
      ))}
    </Stack>
  );
}
