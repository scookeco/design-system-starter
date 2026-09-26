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
 * Fields: Name, Owner and Amount render from CREATE_FIELDS through the field registry, the same
 * registry the record page's properties use; renewal and the reminder stay hand-composed, since no
 * other surface shares them.
 *
 * Writes (src/app/model/mutations.ts): the record is created with createRecord, pessimistically,
 * with an idempotency key: a retry after a failure, or a double submit, sends the same key, so the
 * server makes one record. A changed draft gets a new key. A server failure keeps the draft and
 * says so in a banner. The quick-created person goes through addPerson and appears selected in
 * Owner. A created record gets a success banner linking to it (a real page would redirect).
 *
 * No required attributes on the controls: the page validates on submit, so the browser's own
 * bubbles never pre-empt the summary. Optional fields say "(optional)" instead.
 *
 * Edit (/records/:id/edit, `recordId`): the same fields, loaded from the record. The save is a
 * versioned write (updateRecord, If-Match with the version the edit started from). If someone
 * changed the record meanwhile, a change to different fields is merged on its own; a change to the
 * same field shows the ConflictPanel: yours and theirs side by side, Keep mine (overwrite), Take
 * theirs, or a choice per field.
 *
 * Drafts (src/app/model/drafts.ts): the form owns its draft, never the cache, with the version it
 * started from. It's autosaved on this device and restored on return ("Your unsaved changes are
 * back"); while it's dirty, leaving through a link asks first and closing the tab gets the
 * browser's prompt. If the record moves on underneath an edit (a refetch, a live event), a clean
 * form follows it quietly; a dirty one keeps every keystroke and warns, with Review changes.
 */
import { useEffect, useEffectEvent, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import {
  Banner,
  Button,
  EmptyState,
  Skeleton,
  Card,
  CardBody,
  CardHeader,
  Center,
  Cluster,
  Dialog,
  Link,
  PageHeader,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Textarea,
  currencyDigits,
  useFormat,
} from '../index';
import type { Person, RecordEntity } from '../app/api/schemas';
import type { RecordChanges } from '../app/api/records';
import { changesBetween } from '../app/model/conflicts';
import { conflictingRecord, useAddPerson, useCreateRecord, useUpdateRecord } from '../app/model/mutations';
import { useBeforeUnload, useDraft } from '../app/model/drafts';
import { useLiveActivity } from '../app/model/live';
import { useAccounts, usePeople, useRecord } from '../app/model/queries';
import { usePersonName } from '../app/registries/refs';
import { useNavigate, useNavigationGuard } from '../app/url/useUrlState';
import { FieldInput } from '../app/registries/fields';
import { CREATE_FIELDS } from '../app/registries/recordFields';
import { useTenant } from '../app/tenant';
import { WORKSPACES } from '../app/workspaces';
import { usePermission } from '../app/session';
import { ExampleShell } from './ExampleShell';
import { ConflictPanel } from './ConflictPanel';
import { ChangedWhileEditingBanner, RestoredDraftBanner, UnsavedChangesDialog } from './Drafts';
import { gated, PermissionNote } from './Permission';

export interface RecordDraft {
  name: string;
  /** A person's id. */
  owner: string;
  /** An account's id, or '' for none. */
  account: string;
  description: string;
  /** As typed, in major units ("12500.50"). Sent as integer minor units. */
  amount: string;
  renewal: string;
  remind: boolean;
}

type FieldName = 'name' | 'owner' | 'account' | 'amount' | 'renewal';

/** Field ids double as error-summary link targets. */
const FIELD_ID: Record<FieldName, string> = {
  name: 'record-name',
  owner: 'record-owner',
  account: 'record-account',
  amount: 'record-amount',
  renewal: 'record-renewal',
};

const EMPTY: RecordDraft = { name: '', owner: '', account: '', description: '', amount: '', renewal: '', remind: true };

const RENEWAL = [
  { value: 'renew', label: 'Renews automatically', description: 'The term restarts unless someone cancels it.' },
  { value: 'end', label: 'Ends on the end date' },
  { value: 'monthly', label: 'Rolls month to month' },
];

/** Error copy says what is wrong and how to fix it. Order matches the form, so the summary does too. */
const validate = (draft: RecordDraft, mode: 'create' | 'edit' = 'create'): Partial<Record<FieldName, string>> => {
  const errors: Partial<Record<FieldName, string>> = {};
  if (draft.name.trim() === '') errors.name = 'Enter a name for the record.';
  if (draft.owner === '') errors.owner = 'Choose who owns this record.';
  const amount = Number(draft.amount);
  if (draft.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than 0, for example 12500.';
  if (mode === 'create' && draft.renewal === '') errors.renewal = 'Choose what happens when the term ends.';
  return errors;
};

export interface CreateEditFlowProps {
  /** Edit this record (the route /records/:id/edit). Without one, the page creates a record. */
  recordId?: string;
  /** Create: the starting values. Edit: changes typed over the loaded record (gallery and tests). */
  initialDraft?: Partial<RecordDraft>;
  /** Render as if a submit already failed validation: errors, summary, focus on the summary. */
  initialSubmitted?: boolean;
  /** Submit once the form's data has loaded (gallery and tests). */
  initialSubmitting?: boolean;
  initialQuickCreateOpen?: boolean;
  /** Try to leave for this path once loaded, as a link would (gallery and tests: the unsaved-changes guard). */
  initialLeave?: string;
}

const FORM_ID = 'new-record-form';

export function CreateEditFlow(props: CreateEditFlowProps) {
  return props.recordId ? <EditRecordFlow {...props} recordId={props.recordId} /> : <CreateRecordFlow {...props} />;
}


/** Validation state for one form: errors show after a field is left or after a submit; a failed submit moves focus to the summary. */
function useFormValidation(draft: RecordDraft, mode: 'create' | 'edit', initialSubmitted: boolean) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [failedSubmits, setFailedSubmits] = useState(initialSubmitted ? 1 : 0);
  const errors = validate(draft, mode);
  const shown = (field: FieldName) => (failedSubmits > 0 || touched[field] ? errors[field] : undefined);
  const summary = failedSubmits > 0 ? (Object.keys(FIELD_ID) as FieldName[]).filter((f) => errors[f]) : [];

  // After each failed submit, focus moves to the summary; it is not also announced (announce={false}).
  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  return {
    errors,
    shown,
    summary,
    summaryRef,
    touch: (field: FieldName) => setTouched((current) => ({ ...current, [field]: true })),
    /** True when the draft is valid; otherwise counts a failed submit (the summary shows and takes focus). */
    check: () => {
      if (Object.keys(errors).length === 0) return true;
      setFailedSubmits((n) => n + 1);
      return false;
    },
  };
}

type Validation = ReturnType<typeof useFormValidation>;

/** The error summary: one link per problem, each moving focus to its field. */
function ErrorSummary({ validation, noun }: { validation: Validation; noun: string }) {
  const { summary, summaryRef, errors } = validation;
  if (summary.length === 0) return null;
  const focusField = (field: FieldName) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(FIELD_ID[field])?.focus();
  };
  return (
    <Banner
      ref={summaryRef}
      tabIndex={-1}
      tone="danger"
      announce={false}
      title={summary.length === 1 ? `There is 1 problem with this ${noun}` : `There are ${String(summary.length)} problems with this ${noun}`}
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
  );
}

/** "Add a person": the light rung of the ladder, a quick-create dialog that never leaves the form. */
function AddPersonControl({ initialOpen, onAdded }: { initialOpen: boolean; onAdded: (person: Person) => void }) {
  const addPerson = useAddPerson();
  const addPersonPermission = usePermission('people:create');
  const [open, setOpen] = useState(initialOpen);
  const [personName, setPersonName] = useState('');
  const [personError, setPersonError] = useState<string | undefined>();

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
        onAdded(person);
        setOpen(false);
        setPersonName('');
        setPersonError(undefined);
      },
      onError: () => setPersonError('The person couldn’t be added. Try again.'),
    });
  };

  return (
    <Cluster>
      {addPersonPermission.allowed ? (
        <Dialog
          size="sm"
          title="Add a person"
          description="People own records. They’re invited when a record is sent."
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Button variant="ghost" size="sm" icon="plus">
              Add a person
            </Button>
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
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
      ) : (
        <>
          <Button variant="ghost" size="sm" icon="plus" {...gated(addPersonPermission)}>
            Add a person
          </Button>
          <PermissionNote permission={addPersonPermission} />
        </>
      )}
    </Cluster>
  );
}

function CreateRecordFlow({ initialDraft, initialSubmitted = false, initialSubmitting = false, initialQuickCreateOpen = false, initialLeave }: CreateEditFlowProps) {
  const tenant = useTenant();
  const currency = WORKSPACES[tenant].currency;
  const people = usePeople();
  const accounts = useAccounts();
  const createRecord = useCreateRecord();
  // The form owns its draft (never the cache): autosaved on this device, restored on return.
  const pristine = () => ({ ...EMPTY, ...initialDraft });
  const owned = useDraft<RecordDraft>('record:new', { base: undefined, values: pristine() }, pristine);
  const draft = owned.values;
  const guard = useNavigationGuard(owned.dirty);
  useBeforeUnload(owned.dirty);
  useLeaveOnLoad(initialLeave, people.isSuccess);
  const validation = useFormValidation(draft, 'create', initialSubmitted);
  const { shown, touch } = validation;
  const [created, setCreated] = useState<{ id: string; name: string } | undefined>();
  /** One key per draft: kept across retries of the same draft, replaced when the draft changes. */
  const idempotency = useRef<{ draft: string; key: string } | undefined>(undefined);
  const format = useFormat();
  const fieldContext = { format, currency, people: people.data ?? [], accounts: accounts.data ?? [] };

  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) => owned.set((current) => ({ ...current, [key]: value }));

  const submitDraft = () => {
    if (createRecord.isPending) return;
    if (!validation.check()) return;
    const body = {
      name: draft.name.trim(),
      ownerId: draft.owner,
      accountId: draft.account === '' ? null : draft.account,
      amountMinor: Math.round(Number(draft.amount) * 10 ** currencyDigits(currency)),
    };
    const fingerprint = JSON.stringify(body);
    if (idempotency.current?.draft !== fingerprint) idempotency.current = { draft: fingerprint, key: crypto.randomUUID() };
    createRecord.mutate(
      { record: body, idempotencyKey: idempotency.current.key },
      {
        onSuccess: (record) => {
          idempotency.current = undefined;
          // Saved: the draft is done, so the guard stands down and storage is cleared.
          owned.reset(undefined, pristine());
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

          {owned.restoredAt !== undefined ? <RestoredDraftBanner savedAt={owned.restoredAt} onDiscard={owned.discard} /> : null}

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

          <ErrorSummary validation={validation} noun="record" />

          <Stack as="form" id={FORM_ID} gap="lg" onSubmit={submit}>
            <Card>
              <CardHeader title="Details" description="What the record is and who owns it." />
              <CardBody>
                {/* Registry-rendered: CREATE_FIELDS.details says which fields, the field registry how each one edits. */}
                {CREATE_FIELDS.details.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    inputId={FIELD_ID[field.id]}
                    value={draft[field.id]}
                    onChange={(value) => set(field.id, value)}
                    onBlur={() => touch(field.id)}
                    error={shown(field.id)}
                    context={fieldContext}
                  />
                ))}
                <AddPersonControl
                  initialOpen={initialQuickCreateOpen}
                  onAdded={(person) => {
                    set('owner', person.id);
                    touch('owner');
                  }}
                />
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
                {CREATE_FIELDS.terms.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    inputId={FIELD_ID[field.id]}
                    value={draft[field.id]}
                    onChange={(value) => set(field.id, value)}
                    onBlur={() => touch(field.id)}
                    error={shown(field.id)}
                    context={fieldContext}
                  />
                ))}
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
      <UnsavedChangesDialog guard={guard} onDiscard={owned.discard} />
    </ExampleShell>
  );
}

/** Gallery and tests: try to navigate away once the form has loaded, as a link would. */
function useLeaveOnLoad(href: string | undefined, loaded: boolean) {
  const navigate = useNavigate();
  const leave = useEffectEvent(() => {
    if (href) navigate(href);
  });
  useEffect(() => {
    if (loaded) leave();
  }, [loaded]);
}

/** A record's editable fields as form values (money in major units, as a person would type it). */
export const draftFromRecord = (record: RecordEntity): RecordDraft => {
  const digits = currencyDigits(record.amount.currency);
  return { ...EMPTY, name: record.name, owner: record.ownerId, account: record.accountId ?? '', amount: (record.amount.minor / 10 ** digits).toFixed(digits) };
};

/** The form's values applied to the record they started from ("mine"). */
export const recordFromDraft = (base: RecordEntity, draft: RecordDraft): RecordEntity => ({
  ...base,
  name: draft.name.trim(),
  ownerId: draft.owner,
  accountId: draft.account === '' ? null : draft.account,
  amount: { ...base.amount, minor: Math.round(Number(draft.amount) * 10 ** currencyDigits(base.amount.currency)) },
});

function EditRecordFlow({ recordId, initialDraft, initialSubmitting = false, initialSubmitted = false, initialQuickCreateOpen = false, initialLeave }: CreateEditFlowProps & { recordId: string }) {
  const record = useRecord(recordId);
  const title = record.data?.name ?? 'Record';
  return (
    <EditShell recordId={recordId} title={title}>
      {record.isError ? (
        <EmptyState
          reason="error"
          headingLevel={1}
          title="Couldn’t load this record"
          description="The server didn’t answer as expected. Nothing was lost."
          action={
            <Button variant="secondary" onClick={() => void record.refetch()}>
              Retry
            </Button>
          }
        />
      ) : record.isPending ? (
        <Stack gap="lg" aria-busy="true">
          <Skeleton lines={1} />
          <Card>
            <CardBody>
              <Skeleton lines={4} />
            </CardBody>
          </Card>
        </Stack>
      ) : (
        <EditRecordForm
          record={record.data}
          initialDraft={initialDraft}
          initialSubmitting={initialSubmitting}
          initialSubmitted={initialSubmitted}
          initialQuickCreateOpen={initialQuickCreateOpen}
          initialLeave={initialLeave}
        />
      )}
    </EditShell>
  );
}

const EDIT_FORM_ID = 'edit-record-form';

function EditShell({ recordId, title, children }: { recordId: string; title: string; children: ReactNode }) {
  return (
    <ExampleShell
      current="/records"
      trail={{ items: [{ label: 'Records', href: '/records' }, { label: title, href: `/records/${recordId}` }], current: 'Edit' }}
    >
      <Center max="sm" gutters="lg">
        {children}
      </Center>
    </ExampleShell>
  );
}

interface EditRecordFormProps extends Omit<CreateEditFlowProps, 'recordId'> {
  /** The record as the cache holds it now: it moves on when someone else's change arrives. */
  record: RecordEntity;
}

/** A draft's untouched values: the fields of the record it started from. */
const pristineFor = (base: RecordEntity | undefined) => (base ? draftFromRecord(base) : EMPTY);

function EditRecordForm({ record, initialDraft, initialSubmitting = false, initialSubmitted = false, initialQuickCreateOpen = false, initialLeave }: EditRecordFormProps) {
  const tenant = useTenant();
  const currency = WORKSPACES[tenant].currency;
  const people = usePeople();
  const accounts = useAccounts();
  const update = useUpdateRecord(record.id);
  const format = useFormat();
  // The form owns the draft and the version it started from; the cache keeps only confirmed data.
  const owned = useDraft<RecordDraft>(`record:${record.id}`, { base: record, values: { ...draftFromRecord(record), ...initialDraft } }, pristineFor);
  const base = owned.base ?? record;
  const draft = { base, values: owned.values };
  const guard = useNavigationGuard(owned.dirty);
  useBeforeUnload(owned.dirty);
  useLeaveOnLoad(initialLeave, people.isSuccess);
  const validation = useFormValidation(draft.values, 'edit', initialSubmitted);
  const { shown, touch } = validation;
  const [saved, setSaved] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const live = useLiveActivity();
  const changedBy = usePersonName(live.lastBy ?? '');
  const fieldContext = { format, currency, people: people.data ?? [], accounts: accounts.data ?? [] };

  // A background refetch or a live event moved the record on while the form was open.
  const movedOn = record.version > base.version;
  // Nothing typed yet: follow the record quietly. Something typed: never overwrite it; warn instead.
  const { reset } = owned;
  useEffect(() => {
    if (movedOn && !owned.dirty) reset(record, draftFromRecord(record));
  }, [movedOn, owned.dirty, record, reset]);
  const theirs = conflictingRecord(update.error) ?? (reviewing && movedOn ? record : undefined);

  const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) => {
    setSaved(false);
    owned.set((current) => ({ ...current, [key]: value }));
  };

  /** Send changes based on a version: the draft's base, or theirs after a conflict. */
  const send = (base: RecordEntity, changes: RecordChanges) =>
    update.mutate(
      { base, changes },
      {
        onSuccess: (updated) => {
          // The edit is saved: the draft starts again from the server's answer (and leaves storage).
          owned.reset(updated, draftFromRecord(updated));
          setReviewing(false);
          setSaved(true);
        },
      },
    );

  const save = (event?: FormEvent) => {
    event?.preventDefault();
    if (update.isPending || !validation.check()) return;
    send(draft.base, changesBetween(draft.base, recordFromDraft(draft.base, draft.values)));
  };

  // Gallery and tests: save once the owners have loaded.
  const saveOnLoad = useEffectEvent(() => {
    if (initialSubmitting) save();
  });
  const peopleLoaded = people.isSuccess;
  useEffect(() => {
    if (peopleLoaded) saveOnLoad();
  }, [peopleLoaded]);

  return (
    <Stack gap="lg">
      <PageHeader title="Edit record" description={`Changes to ${draft.base.name} are saved when you choose Save changes.`} />

      {owned.restoredAt !== undefined ? <RestoredDraftBanner savedAt={owned.restoredAt} onDiscard={owned.discard} /> : null}

      {movedOn && owned.dirty && !theirs ? <ChangedWhileEditingBanner by={changedBy} onReview={() => setReviewing(true)} /> : null}

      {saved ? (
        <Banner tone="success" action={<Link href={`/records/${draft.base.id}`}>Open the record</Link>}>
          Your changes were saved.
        </Banner>
      ) : null}

      {theirs ? (
        <ConflictPanel
          base={draft.base}
          mine={recordFromDraft(draft.base, draft.values)}
          theirs={theirs}
          by={conflictingRecord(update.error) ? undefined : changedBy}
          pending={update.isPending}
          onResolve={(changes) => send(theirs, changes)}
          onTakeTheirs={() => {
            update.reset();
            setReviewing(false);
            owned.reset(theirs, draftFromRecord(theirs));
          }}
        />
      ) : update.isError ? (
        <Banner tone="danger" title="Your changes weren’t saved">
          Nothing was lost: your entries are still here. Choose Save changes to try again.
        </Banner>
      ) : null}

      <ErrorSummary validation={validation} noun="record" />

      <Stack as="form" id={EDIT_FORM_ID} gap="lg" onSubmit={save}>
        <Card>
          <CardHeader title="Details" description="What the record is and who owns it." />
          <CardBody>
            {CREATE_FIELDS.details.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                inputId={FIELD_ID[field.id]}
                value={draft.values[field.id]}
                onChange={(value) => set(field.id, value)}
                onBlur={() => touch(field.id)}
                error={shown(field.id)}
                context={fieldContext}
              />
            ))}
            <AddPersonControl
              initialOpen={initialQuickCreateOpen}
              onAdded={(person) => {
                set('owner', person.id);
                touch('owner');
              }}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Terms" description="What the record is worth." />
          <CardBody>
            {CREATE_FIELDS.terms.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                inputId={FIELD_ID[field.id]}
                value={draft.values[field.id]}
                onChange={(value) => set(field.id, value)}
                onBlur={() => touch(field.id)}
                error={shown(field.id)}
                context={fieldContext}
              />
            ))}
          </CardBody>
        </Card>
        <Cluster justify="between">
          <Link href={`/records/${draft.base.id}`}>Cancel</Link>
          <Button type="submit" loading={update.isPending}>
            {update.isPending ? 'Saving changes…' : 'Save changes'}
          </Button>
        </Cluster>
      </Stack>
      <UnsavedChangesDialog guard={guard} onDiscard={owned.discard} />
    </Stack>
  );
}
