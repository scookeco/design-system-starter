/**
 * GOLDEN EXAMPLE: the list page archetype.
 *
 * Built only from system components and layout primitives, imported from the public
 * entry point. No CSS file, no className, no style. Copy structure from here when
 * building a list page; do not copy from other screens.
 *
 * Anatomy:
 *   header   title + description | page actions
 *   toolbar  search · status filter · toggle        (role="search")
 *   content  table with status badges  |  empty state
 *   footer   result count
 *   overlays create dialog, toast on success
 */
import { useId, useMemo, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Center,
  Checkbox,
  Cluster,
  Dialog,
  Heading,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextField,
  ToastProvider,
  Tooltip,
  useToast,
  type BadgeTone,
  type SortDirection,
} from '../index';

export type RecordStatus = 'active' | 'pending' | 'overdue' | 'draft';

/** The one place a domain status maps to a tone. A new status extends this map; it never adds a badge. */
const STATUS: Record<RecordStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  pending: { label: 'Pending', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'danger' },
  draft: { label: 'Draft', tone: 'neutral' },
};

export interface RecordItem {
  id: string;
  name: string;
  owner: string;
  status: RecordStatus;
  amount: number;
  updated: string;
}

export const SAMPLE_RECORDS: readonly RecordItem[] = [
  { id: 'r-1001', name: 'Annual services agreement', owner: 'Operations', status: 'active', amount: 48000, updated: '2026-09-12' },
  { id: 'r-1002', name: 'Hardware lease', owner: 'Facilities', status: 'pending', amount: 12500.5, updated: '2026-09-10' },
  { id: 'r-1003', name: 'Consulting retainer', owner: 'Finance', status: 'overdue', amount: 7200, updated: '2026-08-30' },
  { id: 'r-1004', name: 'Office cleaning', owner: 'Facilities', status: 'active', amount: 3150, updated: '2026-08-28' },
  { id: 'r-1005', name: 'Data processing addendum', owner: 'Legal', status: 'draft', amount: 0, updated: '2026-08-21' },
  { id: 'r-1006', name: 'Software licences', owner: 'Engineering', status: 'active', amount: 96400, updated: '2026-08-19' },
  { id: 'r-1007', name: 'Event venue', owner: 'Marketing', status: 'pending', amount: 18900, updated: '2026-08-02' },
];

type SortKey = 'name' | 'amount';
type StatusFilter = RecordStatus | 'all';

const STATUS_OPTIONS = (Object.keys(STATUS) as RecordStatus[]).map((value) => ({ value, label: STATUS[value].label }));
const FILTER_OPTIONS = [{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export interface ListPageProps {
  records?: readonly RecordItem[];
  initialQuery?: string;
  initialDialogOpen?: boolean;
}

export function ListPage(props: ListPageProps) {
  return (
    <ToastProvider>
      <ListPageContent {...props} />
    </ToastProvider>
  );
}

function ListPageContent({ records = SAMPLE_RECORDS, initialQuery = '', initialDialogOpen = false }: ListPageProps) {
  const titleId = useId();
  const toast = useToast();
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
      <Stack as="main" gap="lg" aria-labelledby={titleId}>
        <Cluster as="header" justify="between" align="end" gap="md">
          <Stack gap="2xs">
            <Heading level={1} id={titleId}>
              Records
            </Heading>
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

        {rows.length === 0 ? (
          <Center max="sm" intrinsic>
            <Stack gap="sm" align="center">
              <Heading level={2} size={3}>
                No records match
              </Heading>
              <Text tone="muted">Try a different search term or status.</Text>
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </Stack>
          </Center>
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
          {`Showing ${String(rows.length)} of ${String(items.length)} records`}
        </Text>
      </Stack>
    </Center>
  );
}
