/**
 * GOLDEN EXAMPLE: the create & edit archetype, both rungs of the friction ladder.
 *
 *   heavy record → a full page form (this page), sections as cards, one column
 *   light entity → a quick-create dialog launched from the form ("Add a person"), no page change
 *
 * Validation: a field shows its error after it is left (blur) or after a submit, and clears the
 * moment it is fixed. A failed submit shows an error summary above the form, moves focus to it,
 * and each summary link moves focus to its field. The submit button stays enabled and carries
 * the pending state; nothing the user typed is cleared on error.
 *
 * Writes (src/app/model/mutations.ts): the record is created with createRecord, pessimistically,
 * with an idempotency key: a retry after a failure, or a double submit, sends the same key, so the
 * server makes one record. A changed draft gets a new key. A server failure keeps the draft and
 * says so in a banner. The quick-created person goes through addPerson and appears selected in
 * Owner. A created record gets a success banner linking to it (a real page would redirect).
 *
 * No required attributes on the controls: the page validates on submit, so the browser's own
 * bubbles never pre-empt the summary. Optional fields say "(optional)" instead.
 */
import { useEffect, useEffectEvent, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Cluster,
  Dialog,
  Link,
  PageHeader,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Textarea,
  currencyDigits,
} from '../index';
import { useAddPerson, useCreateRecord } from '../app/model/mutations';
import { usePeople } from '../app/model/queries';
import { useTenant } from '../app/tenant';
import { WORKSPACES } from '../app/workspaces';
import { ExampleShell } from './ExampleShell';

export interface RecordDraft {
  name: string;
  /** A person's id. */
  owner: string;
  description: string;
  /** As typed, in major units ("12500.50"). Sent as integer minor units. */
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

const RENEWAL = [
  { value: 'renew', label: 'Renews automatically', description: 'The term restarts unless someone cancels it.' },
  { value: 'end', label: 'Ends on the end date' },
  { value: 'monthly', label: 'Rolls month to month' },
];

/** Error copy says what is wrong and how to fix it. Order matches the form, so the summary does too. */
const validate = (draft: RecordDraft): Partial<Record<FieldName, string>> => {
  const errors: Partial<Record<FieldName, string>> = {};
  if (draft.name.trim() === '') errors.name = 'Enter a name for the record.';
  if (draft.owner === '') errors.owner = 'Choose who owns this record.';
  const amount = Number(draft.amount);
  if (draft.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0, for example 12500.';
  if (draft.renewal === '') errors.renewal = 'Choose what happens when the term ends.';
  return errors;
};

export interface CreateEditFlowProps {
  initialDraft?: Partial<RecordDraft>;
  /** Render as if a submit already failed validation: errors, summary, focus on the summary. */
  initialSubmitted?: boolean;
  /** Submit once the form's data has loaded (gallery and tests). */
  initialSubmitting?: boolean;
  initialQuickCreateOpen?: boolean;
}

const FORM_ID = 'new-record-form';

export function CreateEditFlow({ initialDraft, initialSubmitted = false, initialSubmitting = false, initialQuickCreateOpen = false }: CreateEditFlowProps) {
  const tenant = useTenant();
  const currency = WORKSPACES[tenant].currency;
  const people = usePeople();
  const createRecord = useCreateRecord();
  const addPerson = useAddPerson();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<RecordDraft>({ ...EMPTY, ...initialDraft });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [failedSubmits, setFailedSubmits] = useState(initialSubmitted ? 1 : 0);
  const [created, setCreated] = useState<{ id: string; name: string } | undefined>();
  const [quickCreateOpen, setQuickCreateOpen] = useState(initialQuickCreateOpen);
  const [personName, setPersonName] = useState('');
  const [personError, setPersonError] = useState<string | undefined>();
  /** One key per draft: kept across retries of the same draft, replaced when the draft changes. */
  const idempotency = useRef<{ draft: string; key: string } | undefined>(undefined);

  const errors = validate(draft);
  const shown = (field: FieldName) => (failedSubmits > 0 || touched[field] ? errors[field] : undefined);
  const summary = failedSubmits > 0 ? (Object.keys(FIELD_ID) as FieldName[]).filter((f) => errors[f]) : [];
  const ownerOptions = (people.data ?? []).map((person) => ({ value: person.id, label: person.name }));

  // After each failed submit, focus moves to the summary; it is not also announced (announce={false}).
  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const touch = (field: FieldName) => setTouched((current) => ({ ...current, [field]: true }));

  const submitDraft = () => {
    if (createRecord.isPending) return;
    if (Object.keys(errors).length > 0) {
      setFailedSubmits((n) => n + 1);
      return;
    }
    const body = {
      name: draft.name.trim(),
      ownerId: draft.owner,
      amountMinor: Math.round(Number(draft.amount) * 10 ** currencyDigits(currency)),
    };
    const fingerprint = JSON.stringify(body);
    if (idempotency.current?.draft !== fingerprint) idempotency.current = { draft: fingerprint, key: crypto.randomUUID() };
    createRecord.mutate(
      { record: body, idempotencyKey: idempotency.current.key },
      {
        onSuccess: (record) => {
          idempotency.current = undefined;
          setCreated({ id: record.id, name: record.name });
        },
      },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    submitDraft();
  };

  // Gallery and tests: submit once the owners have loaded.
  const submitOnLoad = useEffectEvent(() => {
    if (initialSubmitting) submitDraft();
  });
  const peopleLoaded = people.isSuccess;
  useEffect(() => {
    if (peopleLoaded) submitOnLoad();
  }, [peopleLoaded]);

  const focusField = (field: FieldName) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(FIELD_ID[field])?.focus();
  };

  const createPerson = (event?: FormEvent) => {
    event?.preventDefault();
    // The dialog portals out of the page form in the DOM, but React events still bubble to it.
    event?.stopPropagation();
    const name = personName.trim();
    if (name === '') {
      setPersonError('Enter the person’s name.');
      return;
    }
    addPerson.mutate(name, {
      onSuccess: (person) => {
        set('owner', person.id);
        touch('owner');
        setQuickCreateOpen(false);
        setPersonName('');
        setPersonError(undefined);
      },
      onError: () => setPersonError('The person couldn’t be added. Try again.'),
    });
  };

  const actions = (
    <Center max="sm" gutters="lg">
      <Cluster justify="between">
        <Button variant="ghost">Cancel</Button>
        <Button type="submit" form={FORM_ID} loading={createRecord.isPending}>
          {createRecord.isPending ? 'Creating record…' : 'Create record'}
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
          <PageHeader title="New record" description="Records start as drafts. Nothing is sent until you choose to." />

          {created ? (
            <Banner tone="success" action={<Link href={`/records/${created.id}`}>Open the record</Link>}>
              {`${created.name} was created as a draft.`}
            </Banner>
          ) : null}

          {createRecord.isError ? (
            <Banner tone="danger" title="The record wasn’t created">
              Nothing was lost: your entries are still here. Choose Create record to try again; it won’t make a duplicate.
            </Banner>
          ) : null}

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
                    placeholder={people.isPending ? 'Loading people…' : 'Choose a person'}
                    options={ownerOptions}
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
                      title="Add a person"
                      description="People own records. They’re invited when a record is sent."
                      open={quickCreateOpen}
                      onOpenChange={setQuickCreateOpen}
                      trigger={
                        <Button variant="ghost" size="sm" icon="plus">
                          Add a person
                        </Button>
                      }
                      footer={
                        <>
                          <Button variant="secondary" onClick={() => setQuickCreateOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => createPerson()} loading={addPerson.isPending}>
                            Add person
                          </Button>
                        </>
                      }
                    >
                      <Stack as="form" gap="md" onSubmit={createPerson}>
                        <TextField label="Full name" value={personName} onChange={(event) => setPersonName(event.target.value)} error={personError} />
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
                  label={`Amount (${currency})`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  // Any number of decimals: otherwise the browser blocks "12500.50" as a step mismatch.
                  step="any"
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
