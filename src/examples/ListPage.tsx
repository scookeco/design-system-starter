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
 *   header   PageHeader: title + description | page actions
 *   toolbar  SearchField · Filters Popover (status checkboxes)   (role="search"; hidden until there are records)
 *   chips    one removable Tag per active filter; removing one moves focus to the next chip, or to Filters
 *   content  one of: skeleton rows (loading) · table · empty state (first use | no results | error)
 *   footer   Pagination: "1–5 of 7", Previous · pages · Next. Its summary is the page's one live region
 *            for the count; while loading or failed, a caption announces that instead.
 *   overlays create dialog, toast on success
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Center,
  Checkbox,
  Cluster,
  Dialog,
  EmptyState,
  PageHeader,
  Pagination,
  Popover,
  SearchField,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tag,
  Text,
  TextField,
  Tooltip,
  useFormat,
  useToast,
  type SortDirection,
} from '../index';
import { ExampleShell } from './ExampleShell';
import { SAMPLE_RECORDS, STATUS, type LoadState, type RecordItem, type RecordStatus } from './records';

type SortKey = 'name' | 'amount';

const STATUSES = Object.keys(STATUS) as RecordStatus[];
const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: STATUS[value].label }));
/** Server-side paging stands in here: a real list pages its query, with 25 or 50 rows a page. */
const PAGE_SIZE = 5;
const SKELETON_ROWS = ['a', 'b', 'c', 'd', 'e'];

export interface ListPageProps {
  records?: readonly RecordItem[];
  initialQuery?: string;
  initialDialogOpen?: boolean;
  initialLoadState?: LoadState;
  /** Status filters active on first render (gallery and tests). */
  initialStatuses?: readonly RecordStatus[];
  /** Open the Filters popover on first render (gallery and tests). */
  initialFiltersOpen?: boolean;
  initialPage?: number;
}

export function ListPage(props: ListPageProps) {
  return (
    <ExampleShell current="/records">
      <ListPageContent {...props} />
    </ExampleShell>
  );
}

function ListPageContent({
  records = SAMPLE_RECORDS,
  initialQuery = '',
  initialDialogOpen = false,
  initialLoadState = 'ready',
  initialStatuses = [],
  initialFiltersOpen = false,
  initialPage = 1,
}: ListPageProps) {
  const toast = useToast();
  const format = useFormat();
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [items, setItems] = useState(records);
  const [query, setQuery] = useState(initialQuery);
  const [statuses, setStatuses] = useState<readonly RecordStatus[]>(initialStatuses);
  const [filtersOpen, setFiltersOpen] = useState(initialFiltersOpen);
  const [page, setPage] = useState(initialPage);
  const filtersRef = useRef<HTMLButtonElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusChip, setFocusChip] = useState<number | undefined>();
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'ascending' });
  const [dialogOpen, setDialogOpen] = useState(initialDialogOpen);
  const [draftName, setDraftName] = useState('');
  const [draftStatus, setDraftStatus] = useState<RecordStatus>('draft');
  const [nameError, setNameError] = useState<string | undefined>();

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = items.filter(
      (r) =>
        (statuses.length === 0 || statuses.includes(r.status)) &&
        (needle === '' || r.name.toLowerCase().includes(needle) || r.owner.toLowerCase().includes(needle)),
    );
    const factor = sort.direction === 'ascending' ? 1 : -1;
    return [...filtered].sort((a, b) =>
      sort.key === 'amount' ? (a.amount.minor - b.amount.minor) * factor : a.name.localeCompare(b.name) * factor,
    );
  }, [items, query, statuses, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Removing a chip moves focus to the chip now in its place (or the last one), or to Filters when none are left.
  useEffect(() => {
    if (focusChip === undefined) return;
    setFocusChip(undefined);
    const next = chipRefs.current[Math.min(focusChip, statuses.length - 1)];
    (next ?? filtersRef.current)?.focus();
  }, [focusChip, statuses.length]);

  const toggleStatus = (value: RecordStatus, checked: boolean) => {
    setStatuses((current) => (checked ? STATUSES.filter((s) => s === value || current.includes(s)) : current.filter((s) => s !== value)));
    setPage(1);
  };

  const removeStatus = (index: number) => {
    setStatuses((current) => current.filter((_, i) => i !== index));
    setPage(1);
    setFocusChip(index);
  };

  const toggleSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }));

  const clearFilters = () => {
    setQuery('');
    setStatuses([]);
    setPage(1);
  };

  const createRecord = (event?: FormEvent) => {
    event?.preventDefault();
    if (draftName.trim() === '') {
      setNameError('Enter a name for the record.');
      return;
    }
    const id = `r-${String(1000 + items.length + 1)}`;
    setItems((current) => [
      { id, name: draftName.trim(), owner: 'You', status: draftStatus, amount: { minor: 0, currency: 'USD' }, updated: '2026-09-25' },
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
        <PageHeader
          title="Records"
          description="Track every record, who owns it and where it stands."
          actions={
            <>
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
            </>
          }
        />

        {items.length > 0 ? (
          <Stack gap="sm">
            <Cluster as="form" role="search" gap="sm" align="end" onSubmit={(event) => event.preventDefault()}>
              <SearchField
                label="Search records"
                hideLabel
                placeholder="Search by name or owner"
                value={query}
                onValueChange={(value) => {
                  setQuery(value);
                  setPage(1);
                }}
              />
              <Popover
                label="Filter by status"
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
                trigger={
                  <Button ref={filtersRef} variant="secondary" icon="settings">
                    {statuses.length > 0 ? `Filters (${String(statuses.length)})` : 'Filters'}
                  </Button>
                }
              >
                <Text size="caption" tone="muted">
                  Status
                </Text>
                {STATUSES.map((value) => (
                  <Checkbox
                    key={value}
                    label={STATUS[value].label}
                    checked={statuses.includes(value)}
                    onCheckedChange={(checked) => toggleStatus(value, checked === true)}
                  />
                ))}
              </Popover>
            </Cluster>
            {statuses.length > 0 ? (
              <Cluster as="ul" role="list" aria-label="Active filters" gap="xs">
                {statuses.map((value, index) => (
                  <li key={value}>
                    <Tag
                      onRemove={() => removeStatus(index)}
                      removeLabel={`Remove filter: status ${STATUS[value].label}`}
                      removeRef={(element) => {
                        chipRefs.current[index] = element;
                      }}
                    >
                      {`Status: ${STATUS[value].label}`}
                    </Tag>
                  </li>
                ))}
              </Cluster>
            ) : null}
          </Stack>
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
              {pageRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell rowHeader>{row.name}</TableCell>
                  <TableCell>{row.owner}</TableCell>
                  <TableCell>
                    <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
                  </TableCell>
                  <TableCell>{format.date(row.updated)}</TableCell>
                  <TableCell numeric>{format.money(row.amount.minor, row.amount.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {loadState === 'ready' && rows.length > 0 ? (
          <Pagination label="Records pages" page={currentPage} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} announce />
        ) : (
          <Text size="caption" tone="muted" aria-live="polite">
            {loadState === 'loading'
              ? 'Loading records…'
              : loadState === 'error'
                ? 'Records couldn’t be loaded'
                : `0 of ${String(items.length)} records`}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
