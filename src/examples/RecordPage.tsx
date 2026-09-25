/**
 * GOLDEN EXAMPLE: the record (detail) page archetype.
 *
 * One anatomy for every entity; only the properties change by type. Built from system
 * components and layout primitives inside the app shell. No CSS file, no className, no style.
 *
 * Anatomy:
 *   shell    breadcrumb (Records / <title>) · the Records nav item stays current
 *   header   title + status badge · metadata line | secondary · primary · "More" menu (destructive last)
 *   main     summary card · activity feed with a comment box
 *   rail     properties as a definition list (moves below main when the container is narrow)
 *   states   loading (skeletons mirror the anatomy, aria-busy) · error (shell stays up, Retry)
 *   overlays delete confirmation, toast on success
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
  Heading,
  Menu,
  Sidebar,
  Skeleton,
  Stack,
  Text,
  TextField,
  useToast,
} from '../index';
import { ExampleShell } from './ExampleShell';
import { SAMPLE_RECORDS, STATUS, type LoadState, type RecordItem } from './records';

interface Activity {
  id: string;
  who: string;
  what: string;
  when: string;
}

const ACTIVITY: readonly Activity[] = [
  { id: 'a-3', who: 'Sam Rivera', what: 'changed the status to Active', when: '2026-09-12' },
  { id: 'a-2', who: 'Priya Natarajan', what: 'commented: “Legal review is done.”', when: '2026-09-09' },
  { id: 'a-1', who: 'Operations', what: 'created the record', when: '2026-08-30' },
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** The per-type part: which properties a record shows, in what order. Everything else is shared. */
const properties = (record: RecordItem) => [
  { label: 'Owner', value: record.owner },
  { label: 'Status', value: STATUS[record.status].label },
  { label: 'Amount', value: currency.format(record.amount), numeric: true },
  { label: 'Last updated', value: record.updated, numeric: true },
  { label: 'ID', value: record.id, numeric: true },
];

export interface RecordPageProps {
  record?: RecordItem;
  initialLoadState?: LoadState;
  /** Open the "More" menu on first render (gallery and tests). */
  initialMenuOpen?: boolean;
}

export function RecordPage({ record = SAMPLE_RECORDS[0], ...props }: RecordPageProps) {
  const title = record?.name ?? 'Record';
  return (
    <ExampleShell current="/records" trail={{ items: [{ label: 'Records', href: '/records' }], current: title }}>
      {record ? <RecordPageContent record={record} {...props} /> : null}
    </ExampleShell>
  );
}

function RecordPageContent({ record, initialLoadState = 'ready', initialMenuOpen = false }: RecordPageProps & { record: RecordItem }) {
  const toast = useToast();
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activity, setActivity] = useState(ACTIVITY);
  const [comment, setComment] = useState('');

  const addComment = (event: FormEvent) => {
    event.preventDefault();
    if (comment.trim() === '') return;
    setActivity((current) => [{ id: `a-${String(current.length + 1)}`, who: 'Sam Rivera', what: `commented: “${comment.trim()}”`, when: '2026-09-25' }, ...current]);
    setComment('');
  };

  if (loadState === 'error') {
    return (
      <Center max="lg" gutters="lg">
        <EmptyState
          reason="error"
          headingLevel={1}
          title="Couldn’t load this record"
          description="The server didn’t answer in time. Nothing was lost."
          action={
            <Button variant="secondary" onClick={() => setLoadState('ready')}>
              Retry
            </Button>
          }
        />
      </Center>
    );
  }

  if (loadState === 'loading') {
    return (
      <Center max="lg" gutters="lg">
        <Stack gap="lg" aria-busy="true">
          <Stack gap="xs">
            <Skeleton lines={1} />
            <Text size="caption" tone="muted" aria-live="polite">
              Loading record…
            </Text>
          </Stack>
          <Sidebar placement="end" sideWidth="lg" gap="lg" side={<Card><CardBody><Skeleton lines={5} /></CardBody></Card>}>
            <Stack gap="lg">
              <Skeleton shape="block" />
              <Card>
                <CardBody>
                  <Skeleton lines={4} />
                </CardBody>
              </Card>
            </Stack>
          </Sidebar>
        </Stack>
      </Center>
    );
  }

  return (
    <Center max="lg" gutters="lg">
      <Stack gap="lg">
        <Cluster as="header" justify="between" align="start" gap="md">
          <Stack gap="2xs">
            <Cluster gap="sm" align="center">
              <Heading level={1}>{record.name}</Heading>
              <Badge tone={STATUS[record.status].tone}>{STATUS[record.status].label}</Badge>
            </Cluster>
            <Text tone="muted">{`Owned by ${record.owner} · updated ${record.updated}`}</Text>
          </Stack>
          <Cluster gap="xs">
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
          </Cluster>
        </Cluster>

        <Sidebar
          placement="end"
          sideWidth="lg"
          gap="lg"
          side={
            <Card>
              <CardHeader title="Properties" />
              <CardBody>
                <Stack as="dl" gap="sm">
                  {properties(record).map((property) => (
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
          <Stack gap="lg">
            <Card>
              <CardHeader title="Summary" />
              <CardBody>
                <Text>
                  Covers facilities maintenance, cleaning and security for both offices. Renews each January unless either side gives
                  sixty days’ notice.
                </Text>
              </CardBody>
            </Card>

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
                          {item.when}
                        </Text>
                      </Stack>
                    </Cluster>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        </Sidebar>
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
