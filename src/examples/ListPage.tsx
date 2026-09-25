/**
 * GOLDEN EXAMPLE: the list page archetype.
 *
 * Built only from system components and layout primitives, imported from the public
 * entry point, over the app layer (src/app): the server cache, named predicates and projections.
 * No CSS file, no className, no style. Copy structure from here when building a list page;
 * do not copy from other screens.
 *
 * The page renders inside the app shell (ExampleShell → AppShell): the shell owns the
 * landmarks, navigation and the toast region; the page fills main.
 *
 * Anatomy:
 *   header   PageHeader: title + description | page actions
 *   views    NavTabs (All · Open · Drafts · Archived) with server counts; each view is a predicate
 *   toolbar  SearchField · Filters Popover (status checkboxes)   (role="search")
 *   chips    one removable Tag per active filter; removing one moves focus to the next chip, or to Filters
 *   content  one of: skeleton rows (loading) · table · empty state (first use | no results | error)
 *   footer   Pagination: "1–10 of 219", from the server's total. Its summary is the page's one live
 *            region for the count; while loading or failed, a caption announces that instead.
 *   select   a checkbox per row, named after it; the header box selects the page, then offers
 *            "Select all N matching" (the selection is then the filter, not a list of ids)
 *   bar      the shell's sticky footer while anything is selected: the count (live), Clear
 *            selection, and Delete last, guarded by the canDelete predicate
 *   overlays create dialog; bulk delete confirmation naming the count; toast on success; a
 *            banner that stays for a partial failure ("98 deleted, 2 failed") with Retry
 *
 * Data: the rows are one page of a server-side query (search, filter, sort, page) read from the
 * cache with useRecordList; the tab counts come from useRecordCounts. Neither is copied into state.
 *
 * URL: the view, search, filters, sort and page live in the query string (useUrlState), so any
 * view is a link and Back works. A tab or a page is navigation (push); a filter, a sort or the
 * debounced search is a refinement (replace). The half-typed search stays out of the URL.
 *
 * Selection belongs to one filter: change the search, a filter or the view and it clears.
 */
import { useCallback, useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import {
  Badge,
  Banner,
  Button,
  Center,
  Checkbox,
  Cluster,
  Dialog,
  EmptyState,
  Link,
  NavTabs,
  PageHeader,
  Pagination,
  Popover,
  SearchField,
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
} from '../index';
import type { BulkDeleteResult, RecordStatus, SortKey } from '../app/api/schemas';
import { useBulkDeleteRecords, useCreateRecord, type BulkSelection } from '../app/model/mutations';
import { statusOptionsFor, toRow, VIEWS } from '../app/model/projections';
import {
  deletableCount,
  EMPTY_SELECTION,
  filterKey,
  isSelected,
  pageState,
  selectedCount,
  selectMatching,
  toBulkSelection,
  toggleRow,
  togglePage,
  type Selection,
} from '../app/model/selection';
import { useRecordCounts, useRecordList } from '../app/model/queries';
import { STATUS } from '../app/model/status';
import { listCodec, type ListUrlState } from '../app/url/listState';
import { useDebouncedUrlText, useUrlState } from '../app/url/useUrlState';
import { ExampleShell } from './ExampleShell';

/** A real list pages 25 or 50 rows; the example pages 10 so the gallery stays readable. */
const PAGE_SIZE = 10;
const SKELETON_ROWS = ['a', 'b', 'c', 'd', 'e'];
const COLUMNS = 6;

type SortColumn = 'name' | 'amount' | 'updated';
const sortOf = (sort: SortKey): { column: SortColumn; direction: 'ascending' | 'descending' } => ({
  column: sort.replace('-', '') as SortColumn,
  direction: sort.startsWith('-') ? 'descending' : 'ascending',
});

const plural = (n: string, count: number, one: string, many: string) => `${n} ${count === 1 ? one : many}`;

/** The page's search, filters, sort, page and view come from the URL (/records?view=open&q=…). */
export interface ListPageProps {
  initialDialogOpen?: boolean;
  /** Open the Filters popover on first render (gallery and tests). */
  initialFiltersOpen?: boolean;
  /** Select this page, or everything matching, once rows load (gallery and tests). */
  initialSelection?: 'page' | 'matching';
  /** With a selection: open the delete confirmation, or confirm it straight away (gallery and tests). */
  initialBulkDelete?: 'confirm' | 'submit';
}

/**
 * The page owns the selection (it's shared by the table and the shell's footer bar) and the last
 * bulk result. Both are UI state, so they live here, not in the URL or the cache.
 */
export function ListPage(props: ListPageProps) {
  const [url] = useUrlState(listCodec);
  const key = filterKey(url);
  const [held, setHeld] = useState<{ key: string; selection: Selection }>({ key, selection: EMPTY_SELECTION });
  // A selection made under another filter no longer applies.
  const selection = held.key === key ? held.selection : EMPTY_SELECTION;
  const setSelection = useCallback((next: Selection) => setHeld({ key, selection: next }), [key]);
  const [result, setResult] = useState<BulkDeleteResult | undefined>();

  return (
    <ExampleShell
      current="/records"
      footer={
        selectedCount(selection) > 0 ? (
          <BulkActionBar
            selection={selection}
            initialBulkDelete={props.initialBulkDelete}
            onClear={() => setSelection(EMPTY_SELECTION)}
            onDone={(outcome) => {
              setSelection(EMPTY_SELECTION);
              setResult(outcome.failed.length > 0 ? outcome : undefined);
            }}
          />
        ) : undefined
      }
    >
      <ListPageContent {...props} selection={selection} onSelectionChange={setSelection} result={result} onResultChange={setResult} />
    </ExampleShell>
  );
}

interface ContentProps extends ListPageProps {
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  result: BulkDeleteResult | undefined;
  onResultChange: (result: BulkDeleteResult | undefined) => void;
}

function ListPageContent({
  initialDialogOpen = false,
  initialFiltersOpen = false,
  initialSelection,
  selection,
  onSelectionChange,
  result,
  onResultChange,
}: ContentProps) {
  const toast = useToast();
  const format = useFormat();
  const createRecord = useCreateRecord();
  const retryDelete = useBulkDeleteRecords();

  const [url, nav] = useUrlState(listCodec);
  const query = { ...url, q: url.q.trim(), pageSize: PAGE_SIZE };
  const list = useRecordList(query);
  const counts = useRecordCounts({ q: query.q, status: query.status });
  const commitSearch = useCallback((q: string) => nav.replace({ q, page: 1 }), [nav]);
  const [searchText, setSearchText] = useDebouncedUrlText(url.q, commitSearch);

  const [filtersOpen, setFiltersOpen] = useState(initialFiltersOpen);
  const filtersRef = useRef<HTMLButtonElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusChip, setFocusChip] = useState<number | undefined>();
  const [dialogOpen, setDialogOpen] = useState(initialDialogOpen);
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const statusOptions = statusOptionsFor(query.view);
  const rows = (list.data?.items ?? []).map(toRow);
  const total = list.data?.total ?? 0;
  const filtered = query.q.trim() !== '' || query.status.length > 0;
  const sort = sortOf(query.sort);

  const pageSelection = pageState(selection, rows);
  const filter = { q: query.q, status: query.status, view: query.view };

  // Gallery and tests: make the initial selection once the rows are here.
  const selectedInitially = useRef(false);
  const selectOnLoad = useEffectEvent(() => {
    if (!initialSelection || selectedInitially.current) return;
    selectedInitially.current = true;
    onSelectionChange(initialSelection === 'page' ? togglePage(EMPTY_SELECTION, rows) : selectMatching(filter, total));
  });
  const loaded = list.isSuccess;
  useEffect(() => {
    if (loaded) selectOnLoad();
  }, [loaded]);

  const retry = (failedIds: readonly string[]) =>
    retryDelete.mutate(
      { ids: failedIds },
      {
        onSuccess: (outcome) => {
          onResultChange(outcome.failed.length > 0 ? outcome : undefined);
          if (outcome.failed.length === 0) toast({ title: plural(format.number(outcome.deleted.length), outcome.deleted.length, 'record deleted', 'records deleted'), tone: 'success' });
        },
        onError: () => toast({ title: 'The retry failed', description: 'Nothing changed. Try again.', tone: 'danger', duration: Infinity }),
      },
    );

  /** A refinement of this view: rewrite the URL entry, back to page 1. */
  const refine = (next: Partial<ListUrlState>) => nav.replace({ ...next, page: 1 });

  // Removing a chip moves focus to the chip now in its place (or the last one), or to Filters when none are left.
  useEffect(() => {
    if (focusChip === undefined) return;
    setFocusChip(undefined);
    const next = chipRefs.current[Math.min(focusChip, query.status.length - 1)];
    (next ?? filtersRef.current)?.focus();
  }, [focusChip, query.status.length]);

  const toggleStatus = (value: RecordStatus, checked: boolean) =>
    refine({
      status: checked ? statusOptions.map((o) => o.value).filter((s) => s === value || query.status.includes(s)) : query.status.filter((s) => s !== value),
    });

  const removeStatus = (index: number) => {
    refine({ status: query.status.filter((_, i) => i !== index) });
    setFocusChip(index);
  };

  const toggleSort = (column: SortColumn) => refine({ sort: (query.sort === column ? `-${column}` : column) as SortKey });

  const submitCreate = (event?: FormEvent) => {
    event?.preventDefault();
    const name = draftName.trim();
    if (name === '') {
      setNameError('Enter a name for the record.');
      return;
    }
    createRecord.mutate(
      { record: { name }, idempotencyKey: crypto.randomUUID() },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setDraftName('');
          setNameError(undefined);
          toast({ title: 'Record created', description: `${name} was added as a draft.`, tone: 'success' });
        },
        onError: () => setNameError('The record couldn’t be created. Try again.'),
      },
    );
  };

  const header = (
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
            description="Records start as drafts, owned by you, until they are sent."
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            trigger={<Button icon="plus">New record</Button>}
            footer={
              <>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => submitCreate()} loading={createRecord.isPending}>
                  Create record
                </Button>
              </>
            }
          >
            <Stack as="form" gap="md" onSubmit={submitCreate}>
              <TextField label="Name" value={draftName} onChange={(event) => setDraftName(event.target.value)} error={nameError} required />
            </Stack>
          </Dialog>
        </>
      }
    />
  );

  // First use: nothing in the workspace at all, whatever the view.
  const firstUse = counts.data !== undefined && !filtered && counts.data.all + counts.data.archived === 0;

  return (
    <Center max="lg" gutters="lg">
      <Stack gap="lg">
        {header}

        {firstUse ? (
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
        ) : (
          <>
            <NavTabs
              label="Record views"
              items={VIEWS.map(({ view, label }) => ({
                label: counts.data ? `${label} (${format.number(counts.data[view])})` : label,
                // A tab keeps the search, drops filters the new view can't use, and starts at page 1.
                href: nav.href({ view, status: [], page: 1 }),
              }))}
              current={nav.href({ view: url.view, status: [], page: 1 })}
              onNavigate={(href) => nav.push(listCodec.parse(href.slice(href.indexOf('?') + 1)))}
            />

            <Stack gap="sm">
              <Cluster as="form" role="search" gap="sm" align="end" onSubmit={(event) => event.preventDefault()}>
                <SearchField
                  label="Search records"
                  hideLabel
                  placeholder="Search by name or owner"
                  value={searchText}
                  onValueChange={setSearchText}
                />
                <Popover
                  label="Filter by status"
                  open={filtersOpen}
                  onOpenChange={setFiltersOpen}
                  trigger={
                    <Button ref={filtersRef} variant="secondary" icon="settings">
                      {query.status.length > 0 ? `Filters (${format.number(query.status.length)})` : 'Filters'}
                    </Button>
                  }
                >
                  <Text size="caption" tone="muted">
                    Status
                  </Text>
                  {statusOptions.map(({ value, label }) => (
                    <Checkbox key={value} label={label} checked={query.status.includes(value)} onCheckedChange={(checked) => toggleStatus(value, checked === true)} />
                  ))}
                </Popover>
              </Cluster>
              {query.status.length > 0 ? (
                <Cluster as="ul" role="list" aria-label="Active filters" gap="xs">
                  {query.status.map((value, index) => (
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

            {result ? (
              <Banner
                tone="warning"
                title={`${format.number(result.deleted.length)} deleted, ${format.number(result.failed.length)} failed`}
                onDismiss={() => onResultChange(undefined)}
                action={
                  <Button variant="secondary" loading={retryDelete.isPending} onClick={() => retry(result.failed.map((f) => f.id))}>
                    {retryDelete.isPending ? 'Retrying…' : 'Retry'}
                  </Button>
                }
              >
                <Stack as="ul" gap="2xs">
                  {result.failed.slice(0, 5).map((failure) => (
                    <li key={failure.id}>{`${failure.name}: ${failure.reason}`}</li>
                  ))}
                  {result.failed.length > 5 ? <li>{`and ${format.number(result.failed.length - 5)} more`}</li> : null}
                </Stack>
              </Banner>
            ) : null}

            {list.isSuccess && rows.length > 0 && pageSelection === true && total > rows.length ? (
              <Cluster gap="xs" align="center">
                {selection.scope === 'matching' ? (
                  <>
                    <Text>{`All ${format.number(total)} matching records are selected.`}</Text>
                    <Button variant="ghost" size="sm" onClick={() => onSelectionChange(EMPTY_SELECTION)}>
                      Clear selection
                    </Button>
                  </>
                ) : (
                  <>
                    <Text>{`All ${format.number(rows.length)} on this page are selected.`}</Text>
                    <Button variant="ghost" size="sm" onClick={() => onSelectionChange(selectMatching(filter, total))}>
                      {`Select all ${format.number(total)} matching`}
                    </Button>
                  </>
                )}
              </Cluster>
            ) : null}

            {list.isPending ? (
              <Stack aria-busy="true">
                <Table caption="Records" hideCaption maxHeight="md">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>
                        <Text as="span" size="caption" tone="muted">
                          Select
                        </Text>
                      </TableHeaderCell>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Owner</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Updated</TableHeaderCell>
                      <TableHeaderCell numeric>Amount</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {SKELETON_ROWS.map((key) => (
                      <Skeleton key={key} shape="table-row" columns={COLUMNS} />
                    ))}
                  </TableBody>
                </Table>
              </Stack>
            ) : list.isError ? (
              <EmptyState
                reason="error"
                title="Couldn’t load records"
                description="The server didn’t answer as expected. Nothing was lost."
                action={
                  <Button variant="secondary" onClick={() => void list.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : rows.length === 0 ? (
              <EmptyState
                reason="no-results"
                title="No records match"
                description={filtered ? 'Try a different search term or status.' : 'Nothing in this view yet.'}
                action={
                  filtered ? (
                    <Button variant="secondary" onClick={() => refine({ q: '', status: [], page: 1 })}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table caption="Records" hideCaption maxHeight="md">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>
                      <Checkbox label="Select all on this page" hideLabel checked={pageSelection} onCheckedChange={() => onSelectionChange(togglePage(selection, rows))} />
                    </TableHeaderCell>
                    <TableHeaderCell sort={sort.column === 'name' ? sort.direction : undefined} onSort={() => toggleSort('name')}>
                      Name
                    </TableHeaderCell>
                    <TableHeaderCell>Owner</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell sort={sort.column === 'updated' ? sort.direction : undefined} onSort={() => toggleSort('updated')}>
                      Updated
                    </TableHeaderCell>
                    <TableHeaderCell numeric sort={sort.column === 'amount' ? sort.direction : undefined} onSort={() => toggleSort('amount')}>
                      Amount
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} selected={isSelected(selection, row.id)}>
                      <TableCell>
                        <Checkbox
                          label={`Select ${row.name}`}
                          hideLabel
                          checked={isSelected(selection, row.id)}
                          onCheckedChange={(checked) => onSelectionChange(toggleRow(selection, rows, row, checked === true))}
                        />
                      </TableCell>
                      <TableCell rowHeader>
                        <Link href={`/records/${row.id}`}>{row.name}</Link>
                      </TableCell>
                      <TableCell>{row.ownerName}</TableCell>
                      <TableCell>
                        <Cluster gap="2xs">
                          <Badge tone={row.status.tone}>{row.status.label}</Badge>
                          {row.legalHold ? <Badge tone="warning">Legal hold</Badge> : null}
                        </Cluster>
                      </TableCell>
                      <TableCell>{format.date(row.updatedAt)}</TableCell>
                      <TableCell numeric>{format.money(row.amount.minor, row.amount.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {list.isSuccess && total > 0 ? (
              <Pagination
                label="Records pages"
                page={query.page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(page) => nav.push({ page })}
                announce
              />
            ) : (
              <Text size="caption" tone="muted" aria-live="polite">
                {list.isPending ? 'Loading records…' : list.isError ? 'Records couldn’t be loaded' : '0 records'}
              </Text>
            )}
          </>
        )}
      </Stack>
    </Center>
  );
}

interface BulkActionBarProps {
  selection: Selection;
  initialBulkDelete: ListPageProps['initialBulkDelete'];
  onClear: () => void;
  onDone: (result: BulkDeleteResult) => void;
}

/**
 * The bulk bar, in the shell's sticky footer while anything is selected: the count, then the
 * actions, destructive last. Delete is pessimistic and confirmed with the count in the question.
 */
function BulkActionBar({ selection, initialBulkDelete, onClear, onDone }: BulkActionBarProps) {
  const toast = useToast();
  const format = useFormat();
  const bulkDelete = useBulkDeleteRecords();
  const [confirmOpen, setConfirmOpen] = useState(initialBulkDelete !== undefined);
  const count = selectedCount(selection);
  const deletable = deletableCount(selection);
  const skipped = count - deletable;
  const records = plural(format.number(count), count, 'record', 'records');

  const confirm = (target: BulkSelection = toBulkSelection(selection)) =>
    bulkDelete.mutate(target, {
      onSuccess: (outcome) => {
        setConfirmOpen(false);
        onDone(outcome);
        if (outcome.failed.length === 0) toast({ title: plural(format.number(outcome.deleted.length), outcome.deleted.length, 'record deleted', 'records deleted'), tone: 'success' });
      },
      onError: () => {
        setConfirmOpen(false);
        toast({ title: 'Nothing was deleted', description: 'The server didn’t answer. Your selection is kept: try again.', tone: 'danger', duration: Infinity });
      },
    });

  // Gallery and tests: confirm straight away, once.
  const submitted = useRef(false);
  const submitOnMount = useEffectEvent(() => {
    if (initialBulkDelete !== 'submit' || submitted.current) return;
    submitted.current = true;
    confirm();
  });
  useEffect(() => submitOnMount(), []);

  return (
    <Center max="lg" gutters="lg">
      <Cluster justify="between" align="center">
        <Cluster gap="sm" align="center">
          <Text aria-live="polite">{`${format.number(count)} selected`}</Text>
          {skipped > 0 ? <Text size="caption" tone="muted">{`${format.number(skipped)} on legal hold can’t be deleted`}</Text> : null}
        </Cluster>
        <Cluster gap="sm">
          <Button variant="ghost" onClick={onClear} disabled={bulkDelete.isPending}>
            Clear selection
          </Button>
          <Dialog
            size="sm"
            title={`Delete ${records}?`}
            description={
              skipped > 0
                ? `${plural(format.number(deletable), deletable, 'record', 'records')} will be deleted. ${format.number(skipped)} on legal hold will be skipped. This can’t be undone.`
                : `${count === 1 ? 'It' : 'They'}’ll be removed from every list. This can’t be undone.`
            }
            open={confirmOpen}
            onOpenChange={(open) => {
              if (!bulkDelete.isPending) setConfirmOpen(open);
            }}
            trigger={
              <Button variant="danger" disabled={deletable === 0}>
                Delete
              </Button>
            }
            footer={
              <>
                <Button variant="secondary" disabled={bulkDelete.isPending} onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" loading={bulkDelete.isPending} onClick={() => confirm()}>
                  {bulkDelete.isPending ? 'Deleting…' : `Delete ${records}`}
                </Button>
              </>
            }
          />
        </Cluster>
      </Cluster>
    </Center>
  );
}
