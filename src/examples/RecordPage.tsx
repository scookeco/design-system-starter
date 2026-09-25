/**
 * GOLDEN EXAMPLE: the record (detail) page archetype.
 *
 * One anatomy for every entity; only the properties change by type. Built from system
 * components and layout primitives inside the app shell. No CSS file, no className, no style.
 *
 * Anatomy:
 *   shell    breadcrumb (Records / <title>) · the Records nav item stays current
 *   header   PageHeader: title + status badge · metadata line | secondary · primary · "More" menu (destructive last)
 *   sections NavTabs (Overview · Activity · Files): each section is its own URL, so links, not a tablist
 *   main     the section: summary card | activity feed with a comment box | files (previews in a Frame)
 *   aside    PageLayout's aside ("Properties"): a definition list rendered from RECORD_PROPERTIES through
 *            the field registry; stacks below main when the container is narrow
 *   states   loading (skeletons mirror the anatomy, aria-busy) · error (shell stays up, Retry)
 *   overlays rename dialog, delete confirmation; toasts for results
 *
 * Data: the record is read from the server cache with useRecord(id); the page holds no copy of it.
 * Writes go through named mutations (src/app/model/mutations.ts), each presented its own way:
 *   Rename   optimistic: the title changes at once ("Saving…"); a failure restores the old name
 *            and says so in a toast that stays; the typed name is kept for another try.
 *            A 409 (someone else changed it) shows a Banner with Reload instead.
 *   Archive  pessimistic: "Archiving…" on More, the other actions disabled, then the new status.
 *   Delete   pessimistic, confirmed; refused for records on legal hold (the canDelete predicate).
 */
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Cluster,
  Dialog,
  EmptyState,
  Frame,
  Grid,
  Link,
  Menu,
  NavTabs,
  PageHeader,
  PageLayout,
  Skeleton,
  Stack,
  Text,
  TextField,
  useFormat,
  useToast,
} from '../index';
import { ExampleShell } from './ExampleShell';
import type { RecordEntity } from '../app/api/schemas';
import { isConflict, useArchiveRecord, useBulkDeleteRecords, useRenameRecord } from '../app/model/mutations';
import { canArchive, canDelete, canRename, isOnLegalHold } from '../app/model/predicates';
import { useRecord } from '../app/model/queries';
import { STATUS } from '../app/model/status';
import { FieldDisplay, isNumericField } from '../app/registries/fields';
import { RECORD_PROPERTIES } from '../app/registries/recordFields';

interface Activity {
  id: string;
  who: string;
  what: string;
  when: string;
}

const ACTIVITY: readonly Activity[] = [
  { id: 'a-3', who: 'Sam Rivera', what: 'changed the status to Active', when: '2026-09-12T14:05:00Z' },
  { id: 'a-2', who: 'Priya Natarajan', what: 'commented: “Legal review is done.”', when: '2026-09-09T09:30:00Z' },
  { id: 'a-1', who: 'Operations', what: 'created the record', when: '2026-08-30T16:45:00Z' },
];

interface RecordFile {
  name: string;
  kind: string;
  bytes: number;
  added: string;
  /** Preview image URL. A real app gets these from its file service; the example inlines small drawings. */
  preview: string;
}

const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#f1f5f9"/>${body}</svg>`)}`;

const FILES: readonly RecordFile[] = [
  {
    name: 'Signed agreement.pdf',
    kind: 'PDF',
    bytes: 1_200_000,
    added: '2026-08-30',
    preview: svg('<rect x="44" y="12" width="72" height="96" fill="#fff" stroke="#cbd5e1"/><path d="M54 30h52M54 42h52M54 54h40M54 66h52M54 92h24" stroke="#94a3b8" stroke-width="3"/>'),
  },
  {
    name: 'Site plan.png',
    kind: 'Image',
    bytes: 640_000,
    added: '2026-09-02',
    preview: svg('<path d="M24 20h112v80H24zM24 60h56M80 20v48M104 60h32" fill="none" stroke="#6366f1" stroke-width="3"/>'),
  },
  {
    name: 'Pricing schedule.xlsx',
    kind: 'Spreadsheet',
    bytes: 48_000,
    added: '2026-09-09',
    preview: svg('<rect x="28" y="20" width="104" height="80" fill="#fff" stroke="#cbd5e1"/><path d="M28 40h104M28 60h104M28 80h104M62 20v80M96 20v80" stroke="#94a3b8" stroke-width="2"/>'),
  },
];

export type RecordSection = 'overview' | 'activity' | 'files';

const SECTIONS: readonly { section: RecordSection; label: string }[] = [
  { section: 'overview', label: 'Overview' },
  { section: 'activity', label: 'Activity' },
  { section: 'files', label: 'Files' },
];

/** Each section is its own route: /records/<id>, /records/<id>/activity, /records/<id>/files. */
const sectionHref = (record: RecordEntity, section: RecordSection) => (section === 'overview' ? `/records/${record.id}` : `/records/${record.id}/${section}`);

/** A write to start on mount, so the gallery and tests can show each mutation state. */
export type RecordPageAction = { kind: 'rename'; name: string } | { kind: 'archive' };

export interface RecordPageProps {
  /** The record's id, from the route (/records/:id). */
  recordId?: string;
  /** Start a write once the record has loaded (gallery and tests). */
  initialAction?: RecordPageAction;
  /** Open the "More" menu on first render (gallery and tests). */
  initialMenuOpen?: boolean;
  /** The section to show first. In a product this comes from the route. */
  initialSection?: RecordSection;
}

export function RecordPage({ recordId = 'r-1001', ...props }: RecordPageProps) {
  const record = useRecord(recordId);
  return (
    <ExampleShell current="/records" trail={{ items: [{ label: 'Records', href: '/records' }], current: record.data?.name ?? 'Record' }}>
      <RecordPageContent recordId={recordId} {...props} />
    </ExampleShell>
  );
}

function RecordPageContent({ recordId, initialAction, initialMenuOpen = false, initialSection = 'overview' }: RecordPageProps & { recordId: string }) {
  const toast = useToast();
  const format = useFormat();
  const query = useRecord(recordId);
  const rename = useRenameRecord(recordId);
  const archive = useArchiveRecord(recordId);
  const remove = useBulkDeleteRecords();
  const [section, setSection] = useState<RecordSection>(initialSection);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  /** The person's typed name: kept after a failure, so trying again doesn't mean typing again. */
  const [nameDraft, setNameDraft] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [activity, setActivity] = useState(ACTIVITY);
  const [comment, setComment] = useState('');

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (comment.trim() === '') return;
    setActivity((current) => [{ id: `a-${String(current.length + 1)}`, who: 'Sam Rivera', what: `commented: “${comment.trim()}”`, when: new Date().toISOString() }, ...current]);
    setComment('');
  };

  const submitRename = (name: string) => {
    const record = query.data;
    if (!record) return;
    rename.mutate(
      { name, version: record.version },
      {
        onSuccess: () => setNameDraft(undefined),
        onError: (error) => {
          if (isConflict(error)) return; // The Banner explains it.
          toast({
            title: 'Couldn’t rename the record',
            description: `It’s back to “${record.name}”. Choose Rename to try “${name}” again.`,
            tone: 'danger',
            duration: Infinity,
          });
        },
      },
    );
  };

  const saveRename = (event?: FormEvent) => {
    event?.preventDefault();
    const name = (nameDraft ?? '').trim();
    if (name === '') {
      setNameError('Enter a name for the record.');
      return;
    }
    setRenameOpen(false);
    setNameError(undefined);
    if (name !== query.data?.name) submitRename(name);
  };

  const archiveRecord = () =>
    archive.mutate(undefined, {
      onSuccess: () => toast({ title: 'Record archived', description: 'It’s out of the active lists. Find it under Archived.', tone: 'success' }),
      onError: () => toast({ title: 'Couldn’t archive the record', description: 'Nothing changed. Try again.', tone: 'danger', duration: Infinity }),
    });

  const deleteRecord = () =>
    remove.mutate(
      { ids: [recordId] },
      {
        onSuccess: (result) => {
          setConfirmDelete(false);
          const failure = result.failed[0];
          if (failure) toast({ title: 'Couldn’t delete the record', description: `It’s ${failure.reason}.`, tone: 'danger', duration: Infinity });
          else setDeleted(true);
        },
        onError: () => toast({ title: 'Couldn’t delete the record', description: 'Nothing changed. Try again.', tone: 'danger', duration: Infinity }),
      },
    );

  // Gallery and tests: start one write as soon as the record is here, once.
  const started = useRef(false);
  const startInitialAction = useEffectEvent(() => {
    if (!initialAction || started.current) return;
    started.current = true;
    if (initialAction.kind === 'rename') {
      setNameDraft(initialAction.name);
      submitRename(initialAction.name);
    } else archiveRecord();
  });
  const loaded = query.isSuccess;
  useEffect(() => {
    if (loaded) startInitialAction();
  }, [loaded]);

  if (deleted) {
    return (
      <Center max="lg" gutters="lg">
        <EmptyState
          reason="no-results"
          headingLevel={1}
          title="Record deleted"
          description="It’s gone from every list. Deleting can’t be undone."
          action={<Link href="/records">Back to records</Link>}
        />
      </Center>
    );
  }

  if (query.isError) {
    return (
      <Center max="lg" gutters="lg">
        <EmptyState
          reason="error"
          headingLevel={1}
          title="Couldn’t load this record"
          description="The server didn’t answer as expected. Nothing was lost."
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      </Center>
    );
  }

  if (query.isPending) {
    return (
      <Center max="lg" gutters="lg">
        <Stack gap="lg" aria-busy="true">
          <Stack gap="xs">
            <Skeleton lines={1} />
            <Text size="caption" tone="muted" aria-live="polite">
              Loading record…
            </Text>
          </Stack>
          <PageLayout
            asideLabel="Properties"
            aside={
              <Card>
                <CardBody>
                  <Skeleton lines={5} />
                </CardBody>
              </Card>
            }
          >
            <Stack gap="lg">
              <Skeleton shape="block" />
              <Card>
                <CardBody>
                  <Skeleton lines={4} />
                </CardBody>
              </Card>
            </Stack>
          </PageLayout>
        </Stack>
      </Center>
    );
  }

  const record = query.data;

  return (
    <Center max="lg" gutters="lg">
      <Stack gap="lg">
        {isConflict(rename.error) ? (
          <Banner
            tone="warning"
            title="Someone else changed this record"
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  rename.reset();
                  void query.refetch();
                }}
              >
                Reload
              </Button>
            }
          >
            {`Your name “${rename.variables?.name ?? ''}” wasn’t saved, so nothing of theirs was overwritten. Reload to see their version, then rename it again.`}
          </Banner>
        ) : null}

        <PageHeader
          title={record.name}
          status={
            <Cluster gap="2xs">
              <Badge tone={STATUS[record.status].tone}>{STATUS[record.status].label}</Badge>
              {isOnLegalHold(record) ? <Badge tone="warning">Legal hold</Badge> : null}
            </Cluster>
          }
          description={rename.isPending ? 'Saving the new name…' : `Owned by ${record.owner.name} · updated ${format.relative(record.updatedAt)}`}
          actions={
            <>
              <Button variant="secondary" disabled={archive.isPending}>
                Share
              </Button>
              <Button disabled={archive.isPending} onClick={() => toast({ title: 'Approval requested', tone: 'success' })}>
                Request approval
              </Button>
              <Menu
                defaultOpen={initialMenuOpen}
                align="end"
                trigger={
                  <Button variant="secondary" icon="more" loading={archive.isPending}>
                    {archive.isPending ? 'Archiving…' : 'More'}
                  </Button>
                }
                items={[
                  {
                    label: 'Rename',
                    disabled: !canRename(record) || rename.isPending,
                    onSelect: () => {
                      setNameDraft((draft) => draft ?? record.name);
                      setRenameOpen(true);
                    },
                  },
                  { label: 'Duplicate', icon: 'plus', onSelect: () => toast({ title: 'Record duplicated', tone: 'success' }) },
                  { label: 'Export as CSV', icon: 'download' },
                  { label: 'Archive', disabled: !canArchive(record), onSelect: archiveRecord },
                  'separator',
                  { label: 'Delete record', tone: 'danger', disabled: !canDelete(record), onSelect: () => setConfirmDelete(true) },
                ]}
              />
            </>
          }
        />

        <NavTabs
          label="Record sections"
          items={SECTIONS.map((item) => ({ label: item.label, href: sectionHref(record, item.section) }))}
          current={sectionHref(record, section)}
          onNavigate={(href) => setSection(SECTIONS.find((item) => sectionHref(record, item.section) === href)?.section ?? 'overview')}
        />

        <PageLayout
          asideLabel="Properties"
          aside={
            <Card>
              <CardHeader title="Properties" />
              <CardBody>
                <Stack as="dl" gap="sm">
                  {/* The per-type part is config: RECORD_PROPERTIES says which fields, the field registry how each renders. */}
                  {RECORD_PROPERTIES.map((field) => (
                    <Stack gap="2xs" key={field.id}>
                      <Text as="dt" size="caption" tone="muted">
                        {field.label}
                      </Text>
                      <Text as="dd" numeric={isNumericField(field.type)}>
                        <FieldDisplay field={field} entity={record} format={format} />
                      </Text>
                    </Stack>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          }
        >
          {section === 'overview' ? (
            <Card>
              <CardHeader title="Summary" />
              <CardBody>
                <Text>
                  Covers facilities maintenance, cleaning and security for both offices. Renews each January unless either side gives
                  sixty days’ notice.
                </Text>
              </CardBody>
            </Card>
          ) : null}
          {section === 'activity' ? (
            <Card>
              <CardHeader title="Activity" />
              <CardBody>
                <Stack as="form" gap="sm" onSubmit={addComment}>
                  <TextField label="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} />
                  <Cluster justify="end">
                    <Button type="submit" variant="secondary">
                      Comment
                    </Button>
                  </Cluster>
                </Stack>
                <Stack as="ol" role="list" gap="md">
                  {activity.map((item) => (
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
          ) : null}
          {section === 'files' ? (
            <Card>
              <CardHeader title="Files" />
              <CardBody>
                <Grid as="ul" role="list" min="sm" gap="md">
                  {FILES.map((file) => (
                    <Stack as="li" gap="xs" key={file.name}>
                      {/* Previews are held to one ratio, so the grid lines up whatever the file. The name beside it is the text alternative. */}
                      <Frame ratio="landscape">
                        <img src={file.preview} alt="" />
                      </Frame>
                      <Stack gap="2xs">
                        <Text>{file.name}</Text>
                        <Text size="caption" tone="muted" numeric>
                          {`${file.kind} · ${format.fileSize(file.bytes)} · ${format.date(file.added)}`}
                        </Text>
                      </Stack>
                    </Stack>
                  ))}
                </Grid>
              </CardBody>
            </Card>
          ) : null}
        </PageLayout>
      </Stack>

      <Dialog
        size="sm"
        title="Rename record"
        open={renameOpen}
        onOpenChange={setRenameOpen}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveRename()}>Save name</Button>
          </>
        }
      >
        <Stack as="form" gap="md" onSubmit={saveRename}>
          <TextField label="Name" value={nameDraft ?? ''} onChange={(event) => setNameDraft(event.target.value)} error={nameError} autoComplete="off" />
        </Stack>
      </Dialog>

      <Dialog
        size="sm"
        title="Delete record?"
        description={`${record.name} and its activity will be removed. This can’t be undone.`}
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!remove.isPending) setConfirmDelete(open);
        }}
        footer={
          <>
            <Button variant="secondary" disabled={remove.isPending} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={deleteRecord}>
              {remove.isPending ? 'Deleting…' : 'Delete record'}
            </Button>
          </>
        }
      />
    </Center>
  );
}
