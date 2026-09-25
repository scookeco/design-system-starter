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
 *   aside    PageLayout's aside ("Properties"): a definition list; stacks below main when the container is narrow
 *   states   loading (skeletons mirror the anatomy, aria-busy) · error (shell stays up, Retry)
 *   overlays delete confirmation, toast on success
 *
 * Data: the record is read from the server cache with useRecord(id); the page holds no copy of it.
 */
import { useState, type FormEvent } from 'react';
import {
  Avatar,
  Badge,
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
  type Formatter,
} from '../index';
import { ExampleShell } from './ExampleShell';
import type { RecordEntity } from '../app/api/schemas';
import { isOnLegalHold } from '../app/model/predicates';
import { useRecord } from '../app/model/queries';
import { STATUS } from '../app/model/status';

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

/** The per-type part: which properties a record shows, in what order. Everything else is shared. */
const properties = (record: RecordEntity, format: Formatter) => [
  { label: 'Owner', value: record.owner.name },
  { label: 'Status', value: STATUS[record.status].label },
  { label: 'Amount', value: format.money(record.amount.minor, record.amount.currency), numeric: true },
  { label: 'Last updated', value: format.date(record.updatedAt), numeric: true },
  { label: 'ID', value: record.id, numeric: true },
];

export interface RecordPageProps {
  /** The record's id, from the route (/records/:id). */
  recordId?: string;
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

function RecordPageContent({ recordId, initialMenuOpen = false, initialSection = 'overview' }: RecordPageProps & { recordId: string }) {
  const toast = useToast();
  const format = useFormat();
  const query = useRecord(recordId);
  const [section, setSection] = useState<RecordSection>(initialSection);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activity, setActivity] = useState(ACTIVITY);
  const [comment, setComment] = useState('');

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (comment.trim() === '') return;
    setActivity((current) => [{ id: `a-${String(current.length + 1)}`, who: 'Sam Rivera', what: `commented: “${comment.trim()}”`, when: new Date().toISOString() }, ...current]);
    setComment('');
  };

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
        <PageHeader
          title={record.name}
          status={
            <Cluster gap="2xs">
              <Badge tone={STATUS[record.status].tone}>{STATUS[record.status].label}</Badge>
              {isOnLegalHold(record) ? <Badge tone="warning">Legal hold</Badge> : null}
            </Cluster>
          }
          description={`Owned by ${record.owner.name} · updated ${format.relative(record.updatedAt)}`}
          actions={
            <>
              <Button variant="secondary">Share</Button>
              <Button onClick={() => toast({ title: 'Approval requested', tone: 'success' })}>Request approval</Button>
              <Menu
                defaultOpen={initialMenuOpen}
                align="end"
                trigger={
                  <Button variant="secondary" icon="more">
                    More
                  </Button>
                }
                items={[
                  { label: 'Duplicate', icon: 'plus', onSelect: () => toast({ title: 'Record duplicated', tone: 'success' }) },
                  { label: 'Export as CSV', icon: 'download' },
                  'separator',
                  { label: 'Delete record', tone: 'danger', onSelect: () => setConfirmDelete(true) },
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
                  {properties(record, format).map((property) => (
                    <Stack gap="2xs" key={property.label}>
                      <Text as="dt" size="caption" tone="muted">
                        {property.label}
                      </Text>
                      <Text as="dd" numeric={property.numeric}>
                        {property.value}
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
        title="Delete record?"
        description={`${record.name} and its activity will be removed. This cannot be undone.`}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDelete(false);
                toast({ title: 'Record deleted', tone: 'success' });
              }}
            >
              Delete record
            </Button>
          </>
        }
      />
    </Center>
  );
}
