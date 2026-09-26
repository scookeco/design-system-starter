/**
 * GOLDEN EXAMPLE (AI): inline AI in a create form. The description field can be drafted by the
 * assistant, beside writing it by hand, never instead of it.
 *
 *   ask       "Suggest description" (the sparkle marks it as AI) beside the field, disabled with a
 *             reason when the person can't create records; it sends the name typed so far
 *   suggest   the suggestion streams in as ghost text after what's there (Suggestion): Tab or Accept
 *             takes it, Esc or Dismiss drops it, typing over it ignores it. Nothing becomes the
 *             field's value until accepted
 *   mark      accepted text is marked "Drafted with AI" (AiMarker) until the person edits it
 *   undo      one Undo restores exactly what the field held before the AI's text went in
 *   failure   a rate limit or a refusal says so under the field; the field keeps what was typed
 *
 * Writes: the record is created with createRecord, as in the Create and edit example (the name; a
 * product would send the description too). Data: useDraftSuggestion (src/app/model/ai.ts).
 */
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { AiMarker, Banner, Button, Card, CardBody, CardHeader, Center, Cluster, Link, PageHeader, Stack, Suggestion, Text, TextField } from '../index';
import { useDraftSuggestion } from '../app/model/ai';
import { useCreateRecord } from '../app/model/mutations';
import { usePeople } from '../app/model/queries';
import { usePermission } from '../app/session';
import { ExampleShell } from './ExampleShell';
import { gated, PermissionNote } from './Permission';

export interface CreateWithAiProps {
  /** The name typed so far (gallery and tests). */
  initialName?: string;
  /** Ask for a suggestion once the form has loaded (gallery and tests). */
  initialSuggest?: boolean;
  /** Accept the suggestion as soon as it's complete (gallery and tests: the marked, undoable state). */
  initialAccept?: boolean;
}

const FORM_ID = 'create-with-ai-form';

export function CreateWithAi({ initialName = '', initialSuggest = false, initialAccept = false }: CreateWithAiProps) {
  const people = usePeople();
  const createRecord = useCreateRecord();
  const suggestion = useDraftSuggestion();
  const suggestPermission = usePermission('record:create');
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');
  /** What the field held before the AI's text went in, while that text is unedited: the mark and Undo read it. */
  const [beforeAi, setBeforeAi] = useState<string | undefined>();
  const [created, setCreated] = useState<{ id: string; name: string } | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const idempotency = useRef<string | undefined>(undefined);

  const suggesting = suggestion.status === 'pending' || suggestion.status === 'streaming';
  const ghost = suggestion.status === 'complete' || suggesting ? suggestion.text : undefined;
  // Continue what's there: a space between the person's words and the suggestion's.
  const joined = (text: string) => (description === '' || /\s$/.test(description) ? text : ` ${text}`);

  const accept = () => {
    if (suggestion.status !== 'complete') return;
    setBeforeAi(description);
    setDescription(description + joined(suggestion.text));
    suggestion.clear();
  };

  const edit = (value: string) => {
    setDescription(value);
    setBeforeAi(undefined); // Edited by the person: no longer the AI's text.
  };

  const undo = () => {
    if (beforeAi === undefined) return;
    setDescription(beforeAi);
    setBeforeAi(undefined);
  };

  // Gallery and tests: ask once the form's data is here; accept once the suggestion is complete.
  const started = useRef(false);
  const suggestOnLoad = useEffectEvent(() => {
    if (!initialSuggest || started.current) return;
    started.current = true;
    suggestion.suggest(name);
  });
  const loaded = people.isSuccess;
  useEffect(() => {
    if (loaded) suggestOnLoad();
  }, [loaded]);
  const acceptOnComplete = useEffectEvent(() => {
    if (initialAccept) accept();
  });
  const complete = suggestion.status === 'complete';
  useEffect(() => {
    if (complete) acceptOnComplete();
  }, [complete]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === '') {
      setNameError('Enter a name for the record.');
      return;
    }
    setNameError(undefined);
    idempotency.current ??= crypto.randomUUID();
    createRecord.mutate(
      { record: { name: name.trim() }, idempotencyKey: idempotency.current },
      {
        onSuccess: (record) => {
          idempotency.current = undefined;
          setCreated({ id: record.id, name: record.name });
        },
      },
    );
  };

  return (
    <ExampleShell
      current="/records"
      trail={{ items: [{ label: 'Records', href: '/records' }], current: 'New record' }}
      footer={
        <Center max="sm" gutters="lg">
          <Cluster justify="end">
            <Button type="submit" form={FORM_ID} loading={createRecord.isPending}>
              {createRecord.isPending ? 'Creating record…' : 'Create record'}
            </Button>
          </Cluster>
        </Center>
      }
    >
      <Center max="sm" gutters="lg">
        <Stack gap="lg">
          <PageHeader title="New record" description="Write the description yourself, or let the assistant draft one for you to review." />
          {created ? (
            <Banner tone="success" action={<Link href={`/records/${created.id}`}>Open the record</Link>}>
              {`${created.name} was created as a draft.`}
            </Banner>
          ) : null}
          <Stack as="form" id={FORM_ID} gap="lg" onSubmit={submit}>
            <Card>
              <CardHeader title="Details" description="What the record is." />
              <CardBody>
                <Stack gap="md">
                  <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} error={nameError} autoComplete="off" />
                  <Stack gap="xs">
                    <Suggestion
                      label="Description"
                      description="Shown to everyone with access to the record."
                      value={description}
                      onValueChange={edit}
                      suggestion={ghost === undefined || ghost === '' ? undefined : joined(ghost)}
                      pending={suggesting}
                      onAccept={accept}
                      onDismiss={suggestion.clear}
                    />
                    <Cluster gap="sm">
                      {suggesting ? (
                        <Button variant="secondary" size="sm" icon="stop" onClick={suggestion.stop}>
                          Stop
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" icon="sparkle" onClick={() => suggestion.suggest(name)} {...gated(suggestPermission)}>
                          Suggest description
                        </Button>
                      )}
                      {beforeAi !== undefined ? (
                        <>
                          <AiMarker>Drafted with AI</AiMarker>
                          <Button variant="ghost" size="sm" onClick={undo}>
                            Undo
                          </Button>
                        </>
                      ) : null}
                    </Cluster>
                    <PermissionNote permission={suggestPermission} />
                    {/* Present from mount, so a failure is announced when it happens. */}
                    <Text size="caption" tone="muted" role="status">
                      {suggestion.status === 'error' ? (suggestion.failure?.message ?? '') : ''}
                    </Text>
                  </Stack>
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        </Stack>
      </Center>
    </ExampleShell>
  );
}
