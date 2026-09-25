/**
 * GOLDEN EXAMPLE: the create & edit archetype, both rungs of the friction ladder.
 *
 *   heavy record → a full page form (this page), sections as cards, one column
 *   light entity → a quick-create dialog launched from the form ("New team"), no page change
 *
 * Validation: a field shows its error after it is left (blur) or after a submit, and clears the
 * moment it is fixed. A failed submit shows an error summary above the form, moves focus to it,
 * and each summary link moves focus to its field. The submit button stays enabled and carries
 * the pending state; nothing the user typed is cleared on error.
 *
 * Feedback is in place: the new team appears selected in Owner, and a created record gets a
 * success banner (a real page would redirect to the record). The action bar is the shell's
 * sticky footer, so Cancel and Create stay in reach on a long form.
 *
 * No required attributes on the controls: the page validates on submit, so the browser's own
 * bubbles never pre-empt the summary. Optional fields say "(optional)" instead.
 */
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Cluster,
  Dialog,
  Heading,
  RadioGroup,
  Select,
  Stack,
  Switch,
  Text,
  TextField,
  Textarea,
  type SelectOption,
} from '../index';
import { ExampleShell } from './ExampleShell';

export interface RecordDraft {
  name: string;
  owner: string;
  description: string;
  amount: string;
  renewal: string;
  remind: boolean;
}

type FieldName = 'name' | 'owner' | 'amount' | 'renewal';

/** Field ids double as error-summary link targets. */
const FIELD_ID: Record<FieldName, string> = {
  name: 'record-name',
  owner: 'record-owner',
  amount: 'record-amount',
  renewal: 'record-renewal',
};

const EMPTY: RecordDraft = { name: '', owner: '', description: '', amount: '', renewal: '', remind: true };

const TEAMS: readonly SelectOption[] = [
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
];

const RENEWAL = [
  { value: 'renew', label: 'Renews automatically', description: 'The term restarts unless someone cancels it.' },
  { value: 'end', label: 'Ends on the end date' },
  { value: 'monthly', label: 'Rolls month to month' },
];

/** Error copy says what is wrong and how to fix it. Order matches the form, so the summary does too. */
const validate = (draft: RecordDraft): Partial<Record<FieldName, string>> => {
  const errors: Partial<Record<FieldName, string>> = {};
  if (draft.name.trim() === '') errors.name = 'Enter a name for the record.';
  if (draft.owner === '') errors.owner = 'Choose the team that owns this record.';
  const amount = Number(draft.amount);
  if (draft.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0, for example 12500.';
  if (draft.renewal === '') errors.renewal = 'Choose what happens when the term ends.';
  return errors;
};

export interface CreateEditFlowProps {
  initialDraft?: Partial<RecordDraft>;
  /** Render as if a submit already failed: errors, summary, focus on the summary. */
  initialSubmitted?: boolean;
  /** Render with the submit pending (gallery and tests). */
  initialSubmitting?: boolean;
  initialQuickCreateOpen?: boolean;
}

const FORM_ID = 'new-record-form';

export function CreateEditFlow({ initialDraft, initialSubmitted = false, initialSubmitting = false, initialQuickCreateOpen = false }: CreateEditFlowProps) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<RecordDraft>({ ...EMPTY, ...initialDraft });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [failedSubmits, setFailedSubmits] = useState(initialSubmitted ? 1 : 0);
  const [submitting, setSubmitting] = useState(initialSubmitting);
  const [created, setCreated] = useState<string | undefined>();
  const [teams, setTeams] = useState(TEAMS);
  const [quickCreateOpen, setQuickCreateOpen] = useState(initialQuickCreateOpen);
  const [teamName, setTeamName] = useState('');
  const [teamError, setTeamError] = useState<string | undefined>();

  const errors = validate(draft);
  const shown = (field: FieldName) => (failedSubmits > 0 || touched[field] ? errors[field] : undefined);
  const summary = failedSubmits > 0 ? (Object.keys(FIELD_ID) as FieldName[]).filter((f) => errors[f]) : [];

  // After each failed submit, focus moves to the summary; it is not also announced (announce={false}).
  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const touch = (field: FieldName) => setTouched((current) => ({ ...current, [field]: true }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (Object.keys(errors).length > 0) {
      setFailedSubmits((n) => n + 1);
      return;
    }
    setSubmitting(true);
    // Stands in for the create request.
    window.setTimeout(() => {
      setSubmitting(false);
      setCreated(draft.name.trim());
    }, 800);
  };

  const focusField = (field: FieldName) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(FIELD_ID[field])?.focus();
  };

  const createTeam = (event?: FormEvent) => {
    event?.preventDefault();
    // The dialog portals out of the page form in the DOM, but React events still bubble to it.
    event?.stopPropagation();
    const name = teamName.trim();
    if (name === '') {
      setTeamError('Enter a name for the team.');
      return;
    }
    const value = name.toLowerCase().replace(/\s+/g, '-');
    setTeams((current) => [...current, { value, label: name }]);
    set('owner', value);
    setQuickCreateOpen(false);
    setTeamName('');
    setTeamError(undefined);
  };

  const actions = (
    <Center max="sm" gutters="lg">
      <Cluster justify="between">
        <Button variant="ghost">Cancel</Button>
        <Button type="submit" form={FORM_ID} loading={submitting}>
          {submitting ? 'Creating record…' : 'Create record'}
        </Button>
      </Cluster>
    </Center>
  );

  return (
    <ExampleShell
      current="/records"
      trail={{ items: [{ label: 'Records', href: '/records' }], current: 'New record' }}
      footer={actions}
    >
      <Center max="sm" gutters="lg">
        <Stack gap="lg">
          <Stack gap="2xs">
            <Heading level={1}>New record</Heading>
            <Text tone="muted">Records start as drafts. Nothing is sent until you choose to.</Text>
          </Stack>

          {created ? <Banner tone="success">{`${created} was created as a draft.`}</Banner> : null}

          {summary.length > 0 ? (
            <Banner
              ref={summaryRef}
              tabIndex={-1}
              tone="danger"
              announce={false}
              title={summary.length === 1 ? 'There is 1 problem with this record' : `There are ${String(summary.length)} problems with this record`}
            >
              <Stack as="ul" gap="2xs">
                {summary.map((field) => (
                  <li key={field}>
                    <a href={`#${FIELD_ID[field]}`} onClick={focusField(field)}>
                      {errors[field]}
                    </a>
                  </li>
                ))}
              </Stack>
            </Banner>
          ) : null}

          <Stack as="form" id={FORM_ID} gap="lg" onSubmit={submit}>
            <Card>
              <CardHeader title="Details" description="What the record is and who owns it." />
              <CardBody>
                <TextField
                  id={FIELD_ID.name}
                  label="Name"
                  value={draft.name}
                  onChange={(event) => set('name', event.target.value)}
                  onBlur={() => touch('name')}
                  error={shown('name')}
                  autoComplete="off"
                />
                <Stack gap="xs">
                  <Select
                    id={FIELD_ID.owner}
                    label="Owner"
                    placeholder="Choose a team"
                    options={teams}
                    value={draft.owner}
                    onValueChange={(value) => {
                      set('owner', value);
                      touch('owner');
                    }}
                    error={shown('owner')}
                  />
                  <Cluster>
                    <Dialog
                      size="sm"
                      title="New team"
                      description="Teams own records. Add members later."
                      open={quickCreateOpen}
                      onOpenChange={setQuickCreateOpen}
                      trigger={
                        <Button variant="ghost" size="sm" icon="plus">
                          New team
                        </Button>
                      }
                      footer={
                        <>
                          <Button variant="secondary" onClick={() => setQuickCreateOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => createTeam()}>Create team</Button>
                        </>
                      }
                    >
                      <Stack as="form" gap="md" onSubmit={createTeam}>
                        <TextField label="Team name" value={teamName} onChange={(event) => setTeamName(event.target.value)} error={teamError} />
                      </Stack>
                    </Dialog>
                  </Cluster>
                </Stack>
                <Textarea
                  label="Description (optional)"
                  description="Shown to everyone with access to the record."
                  value={draft.description}
                  onChange={(event) => set('description', event.target.value)}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Terms" description="Money and what happens when the term ends." />
              <CardBody>
                <TextField
                  id={FIELD_ID.amount}
                  label="Amount (USD)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={draft.amount}
                  onChange={(event) => set('amount', event.target.value)}
                  onBlur={() => touch('amount')}
                  error={shown('amount')}
                />
                <RadioGroup
                  id={FIELD_ID.renewal}
                  label="When the term ends"
                  options={RENEWAL}
                  value={draft.renewal}
                  onValueChange={(value) => {
                    set('renewal', value);
                    touch('renewal');
                  }}
                  error={shown('renewal')}
                />
                <Switch
                  label="Remind the owner before renewal"
                  description="An email 30 days before the term ends."
                  checked={draft.remind}
                  onCheckedChange={(checked) => set('remind', checked)}
                />
              </CardBody>
            </Card>
          </Stack>
        </Stack>
      </Center>
    </ExampleShell>
  );
}
