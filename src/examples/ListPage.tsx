/**
 * GOLDEN EXAMPLE: the list page archetype.
 *
 * Built only from system components and layout primitives, imported from the public
 * entry point. No CSS file, no className, no style. Copy structure from here when
 * building a list page; do not copy from other screens.
 *
 * The page renders inside the app shell (ExampleShell → AppShell): the shell owns the
 * landmarks, navigation and the toast region; the page fills main.
 *
 * Anatomy:
 *   header   title + description | page actions
 *   toolbar  search · status filter · toggle        (role="search"; hidden until there are records)
 *   content  one of: skeleton rows (loading) · table · empty state (first use | no results | error)
 *   footer   result count
 *   overlays create dialog, toast on success
 */
import { useMemo, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Center,
  Checkbox,
  Cluster,
  Dialog,
  EmptyState,
  Heading,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextField,
  Tooltip,
  useToast,
  type SortDirection,
} from '../index';
import { ExampleShell } from './ExampleShell';
import { SAMPLE_RECORDS, STATUS, type LoadState, type RecordItem, type RecordStatus } from './records';

type SortKey = 'name' | 'amount';
type StatusFilter = RecordStatus | 'all';

const STATUS_OPTIONS = (Object.keys(STATUS) as RecordStatus[]).map((value) => ({ value, label: STATUS[value].label }));
const FILTER_OPTIONS = [{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const SKELETON_ROWS = ['a', 'b', 'c', 'd', 'e'];

export interface ListPageProps {
  records?: readonly RecordItem[];
  initialQuery?: string;
  initialDialogOpen?: boolean;
  initialLoadState?: LoadState;
}

export function ListPage(props: ListPageProps) {
  return (
    <ExampleShell current="/records">
      <ListPageContent {...props} />
    </ExampleShell>
  );
}

function ListPageContent({ records = SAMPLE_RECORDS, initialQuery = '', initialDialogOpen = false, initialLoadState = 'ready' }: ListPageProps) {
  const toast = useToast();
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [items, setItems] = useState(records);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'ascending' });
  const [dialogOpen, setDialogOpen] = useState(initialDialogOpen);
  const [draftName, setDraftName] = useState('');
  const [draftStatus, setDraftStatus] = useState<RecordStatus>('draft');
  const [nameError, setNameError] = useState<string | undefined>();

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = items.filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (includeDrafts || r.status !== 'draft') &&
        (needle === '' || r.name.toLowerCase().includes(needle) || r.owner.toLowerCase().includes(needle)),
    );
    const factor = sort.direction === 'ascending' ? 1 : -1;
    return [...filtered].sort((a, b) =>
      sort.key === 'amount' ? (a.amount - b.amount) * factor : a.name.localeCompare(b.name) * factor,
    );
  }, [items, query, status, includeDrafts, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }));

  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setIncludeDrafts(true);
  };

  const createRecord = (event?: FormEvent) => {
    event?.preventDefault();
    if (draftName.trim() === '') {
      setNameError('Enter a name for the record.');
      return;
    }
    const id = `r-${String(1000 + items.length + 1)}`;
    setItems((current) => [
      { id, name: draftName.trim(), owner: 'You', status: draftStatus, amount: 0, updated: '2026-09-25' },
      ...current,
    ]);
    setDialogOpen(false);
    setDraftName('');
    setNameError(undefined);
    toast({ title: 'Record created', description: `${draftName.trim()} was added as ${STATUS[draftStatus].label.toLowerCase()}.`, tone: 'success' });
  };

  return (
    <Center max="lg" gutters="lg">
      <Stack gap="lg">
        <Cluster as="header" justify="between" align="end" gap="md">
          <Stack gap="2xs">
            <Heading level={1}>Records</Heading>
            <Text tone="muted">Track every record, who owns it and where it stands.</Text>
          </Stack>
          <Cluster gap="xs">
            <Tooltip content="Download the filtered list as CSV">
              <Button variant="secondary" icon="download">
                Export
              </Button>
            </Tooltip>
            <Dialog
              title="New record"
              description="Records start as drafts until they are sent."
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              trigger={<Button icon="plus">New record</Button>}
              footer={
                <>
                  <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => createRecord()}>Create record</Button>
                </>
              }
            >
              <Stack as="form" gap="md" onSubmit={createRecord}>
                <TextField
                  label="Name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  error={nameError}
                  required
                />
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={draftStatus}
                  onValueChange={(value) => setDraftStatus(value as RecordStatus)}
                />
              </Stack>
            </Dialog>
          </Cluster>
        </Cluster>

        {items.length > 0 ? (
          <Cluster as="form" role="search" gap="sm" align="center" onSubmit={(event) => event.preventDefault()}>
            <TextField
              label="Search records"
              hideLabel
              type="search"
              placeholder="Search by name or owner"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              label="Filter by status"
              hideLabel
              options={FILTER_OPTIONS}
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            />
            <Checkbox label="Include drafts" checked={includeDrafts} onCheckedChange={(checked) => setIncludeDrafts(checked === true)} />
          </Cluster>
        ) : null}

        {loadState === 'loading' ? (
          <Stack aria-busy="true">
            <Table caption="Records" hideCaption maxHeight="md">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Owner</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Updated</TableHeaderCell>
                  <TableHeaderCell numeric>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SKELETON_ROWS.map((key) => (
                  <Skeleton key={key} shape="table-row" columns={5} />
                ))}
              </TableBody>
            </Table>
          </Stack>
        ) : loadState === 'error' ? (
          <EmptyState
            reason="error"
            title="Couldn’t load records"
            description="The server didn’t answer in time. Nothing was lost."
            action={
              <Button variant="secondary" onClick={() => setLoadState('ready')}>
                Retry
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            reason="first-use"
            title="Create your first record"
            description="Records keep each agreement, its owner and its amount in one place."
            action={
              <Button icon="plus" onClick={() => setDialogOpen(true)}>
                New record
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            reason="no-results"
            title="No records match"
            description="Try a different search term or status."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <Table caption="Records" hideCaption maxHeight="md">
            <TableHead>
              <TableRow>
                <TableHeaderCell
                  sort={sort.key === 'name' ? sort.direction : undefined}
                  onSort={() => toggleSort('name')}
                >
                  Name
                </TableHeaderCell>
                <TableHeaderCell>Owner</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Updated</TableHeaderCell>
                <TableHeaderCell
                  numeric
                  sort={sort.key === 'amount' ? sort.direction : undefined}
                  onSort={() => toggleSort('amount')}
                >
                  Amount
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell rowHeader>{row.name}</TableCell>
                  <TableCell>{row.owner}</TableCell>
                  <TableCell>
                    <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
                  </TableCell>
                  <TableCell>{row.updated}</TableCell>
                  <TableCell numeric>{currency.format(row.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Text size="caption" tone="muted" numeric aria-live="polite">
          {loadState === 'loading'
            ? 'Loading records…'
            : loadState === 'error'
              ? 'Records couldn’t be loaded'
              : `Showing ${String(rows.length)} of ${String(items.length)} records`}
        </Text>
      </Stack>
    </Center>
  );
}
