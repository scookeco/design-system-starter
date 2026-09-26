/**
 * GOLDEN EXAMPLES: schema-driven list, record and form pages. One page per archetype for EVERY
 * entity in src/app/registries/entities.ts: the config says which fields exist, the field registry
 * says how each one displays and edits, and these pages only arrange them. Accounts and people get
 * all their pages this way; a new entity that fits them is config, not a new page.
 *
 * They follow the hand-built archetypes (ListPage, RecordPage, CreateEditFlow) in anatomy, states
 * and permissions, at a smaller scale: reference data is loaded whole, so the list has no paging.
 *
 *   list    PageHeader (count, New <entity> if the role may create) · a table: the title links to
 *           the record, each column renders through the registry
 *   record  breadcrumb · PageHeader (Edit, disabled with the reason when the role can't) · the
 *           records that point at this entity by id, with rollups from the server's counts ·
 *           a properties rail
 *   form    create and edit in one: fields from the config, errors on blur and on submit with a
 *           focused summary, a safe-to-retry create (idempotency key), a 409 on a stale edit
 */
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import {
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Cluster,
  EmptyState,
  Link,
  PageHeader,
  PageLayout,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  currencyDigits,
  useFormat,
} from '../index';
import { isConflict } from '../app/model/mutations';
import { toRow } from '../app/model/projections';
import { useAccounts, usePeople, useRecordCounts, useRecordList } from '../app/model/queries';
import type { EntityConfig, EntityDraft } from '../app/registries/entities';
import { FieldDisplay, FieldInput, isNumericField } from '../app/registries/fields';
import { usePermission } from '../app/session';
import { useTenant } from '../app/tenant';
import { useNavigate } from '../app/url/useUrlState';
import { WORKSPACES } from '../app/workspaces';
import { ExampleShell } from './ExampleShell';
import { gated, PermissionNote } from './Permission';

type Entity = { id: string };

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many).toLowerCase();

/* ─── List ─────────────────────────────────────────────────────────────────────────────────── */

export function EntityListPage<E extends Entity>({ config }: { config: EntityConfig<E> }) {
  const format = useFormat();
  const navigate = useNavigate();
  const list = config.useList();
  const create = usePermission(config.capabilities.create ?? config.capabilities.read);
  const items = list.data ?? [];

  return (
    <ExampleShell current={config.path}>
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          <PageHeader
            title={config.label.many}
            description={config.description}
            actions={
              config.form && config.capabilities.create ? (
                <Button icon="plus" onClick={() => navigate(`${config.path}/new`)} {...gated(create)}>
                  {`New ${config.label.one.toLowerCase()}`}
                </Button>
              ) : undefined
            }
          />
          {config.form && config.capabilities.create ? <PermissionNote permission={create} /> : null}

          {list.isPending ? (
            <Stack aria-busy="true">
              <Skeleton lines={5} />
              <Text size="caption" tone="muted" aria-live="polite">{`Loading ${config.label.many.toLowerCase()}…`}</Text>
            </Stack>
          ) : list.isError ? (
            <EmptyState
              reason="error"
              title={`Couldn’t load ${config.label.many.toLowerCase()}`}
              description="The server didn’t answer as expected. Nothing was lost."
              action={
                <Button variant="secondary" onClick={() => void list.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : (
            <Stack gap="sm">
              <Text size="caption" tone="muted" numeric>
                {`${format.number(items.length)} ${plural(items.length, config.label.one, config.label.many)}`}
              </Text>
              <Table caption={config.label.many} hideCaption>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    {config.columns.map((column) => (
                      <TableHeaderCell key={column.id} numeric={isNumericField(column.type)}>
                        {column.label}
                      </TableHeaderCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell rowHeader>
                        <Link href={`${config.path}/${item.id}`}>{config.title(item)}</Link>
                      </TableCell>
                      {config.columns.map((column) => (
                        <TableCell key={column.id} numeric={isNumericField(column.type)}>
                          <FieldDisplay field={column} entity={item} format={format} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}
        </Stack>
      </Center>
    </ExampleShell>
  );
}

/* ─── Record ───────────────────────────────────────────────────────────────────────────────── */

export function EntityRecordPage<E extends Entity>({ config, id }: { config: EntityConfig<E>; id: string }) {
  const format = useFormat();
  const navigate = useNavigate();
  const query = config.useOne(id);
  const entity = query.data;
  const edit = usePermission(config.capabilities.edit ?? config.capabilities.read);
  const canEditAtAll = Boolean(config.form && config.capabilities.edit);

  return (
    <ExampleShell current={config.path} trail={{ items: [{ label: config.label.many, href: config.path }], current: entity ? config.title(entity) : config.label.one }}>
      <Center max="lg" gutters="lg">
        {query.isPending ? (
          <Stack gap="lg" aria-busy="true">
            <Skeleton lines={1} />
            <Text size="caption" tone="muted" aria-live="polite">{`Loading ${config.label.one.toLowerCase()}…`}</Text>
            <Skeleton shape="block" />
          </Stack>
        ) : query.isError || !entity ? (
          <EmptyState
            reason={query.isError ? 'error' : 'no-results'}
            headingLevel={1}
            title={query.isError ? `Couldn’t load this ${config.label.one.toLowerCase()}` : `No such ${config.label.one.toLowerCase()}`}
            description={query.isError ? 'The server didn’t answer as expected. Nothing was lost.' : 'It may have been deleted, or the link is out of date.'}
            action={<Link href={config.path}>{`Back to ${config.label.many.toLowerCase()}`}</Link>}
          />
        ) : (
          <Stack gap="lg">
            <PageHeader
              title={config.title(entity)}
              description={config.label.one}
              actions={
                canEditAtAll ? (
                  <Button variant="secondary" onClick={() => navigate(`${config.path}/${entity.id}/edit`)} {...gated(edit)}>
                    Edit
                  </Button>
                ) : undefined
              }
            />
            {canEditAtAll ? <PermissionNote permission={edit} /> : null}
            <PageLayout
              asideLabel="Properties"
              aside={
                <Card>
                  <CardHeader title="Properties" />
                  <CardBody>
                    <Stack as="dl" gap="sm">
                      {config.properties.map((field) => (
                        <Stack gap="2xs" key={field.id}>
                          <Text as="dt" size="caption" tone="muted">
                            {field.label}
                          </Text>
                          <Text as="dd" numeric={isNumericField(field.type)}>
                            <FieldDisplay field={field} entity={entity} format={format} />
                          </Text>
                        </Stack>
                      ))}
                    </Stack>
                  </CardBody>
                </Card>
              }
            >
              {config.related ? <RelatedRecords title={config.related.title} filter={config.related.filter(entity)} /> : null}
            </PageLayout>
          </Stack>
        )}
      </Center>
    </ExampleShell>
  );
}

/**
 * A related-entity section is a join projection: the records list query, filtered by this entity's
 * id, through the same toRow and the same counts (so "12 open" here means what Open means there).
 */
function RelatedRecords({ title, filter }: { title: string; filter: { account?: string; owner?: string } }) {
  const format = useFormat();
  const list = useRecordList({ q: '', status: [], view: 'all', sort: 'name', page: 1, pageSize: 10, ...filter });
  const counts = useRecordCounts({ q: '', status: [], ...filter });
  const rows = (list.data?.items ?? []).map(toRow);
  const total = list.data?.total ?? 0;
  return (
    <Card>
      <CardHeader
        title={title}
        description={
          counts.data
            ? `${format.number(counts.data.counts.all)} records · ${format.number(counts.data.counts.open)} open · ${format.number(counts.data.counts.archived)} archived`
            : 'Counting…'
        }
      />
      <CardBody>
        {list.isPending ? (
          <Skeleton lines={3} />
        ) : list.isError ? (
          <Text tone="muted">The records couldn’t be loaded.</Text>
        ) : rows.length === 0 ? (
          <Text tone="muted">No records yet.</Text>
        ) : (
          <Stack gap="xs">
            <Table caption={title} hideCaption>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell numeric>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell rowHeader>
                      <Link href={`/records/${row.id}`}>{row.name}</Link>
                    </TableCell>
                    <TableCell>
                      <Badge tone={row.status.tone}>{row.status.label}</Badge>
                    </TableCell>
                    <TableCell numeric>{format.money(row.amount.minor, row.amount.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {total > rows.length ? <Text size="caption" tone="muted">{`Showing ${format.number(rows.length)} of ${format.number(total)}`}</Text> : null}
          </Stack>
        )}
      </CardBody>
    </Card>
  );
}

/* ─── Form ─────────────────────────────────────────────────────────────────────────────────── */

export interface EntityFormPageProps<E extends Entity> {
  config: EntityConfig<E>;
  /** Edit this entity; omit to create one. */
  id?: string;
  /** Start from these values (gallery and tests). */
  initialDraft?: EntityDraft;
  /** Render as if a submit already failed validation (gallery and tests). */
  initialSubmitted?: boolean;
}

export function EntityFormPage<E extends Entity>({ config, id, ...props }: EntityFormPageProps<E>) {
  // Editing waits for the entity, so the form starts from what the server has.
  const existing = config.useOne(id ?? '');
  const title = id ? `Edit ${config.label.one.toLowerCase()}` : `New ${config.label.one.toLowerCase()}`;
  const trail = { items: [{ label: config.label.many, href: config.path }], current: title };
  if (id && existing.isPending) {
    return (
      <ExampleShell current={config.path} trail={trail}>
        <Center max="sm" gutters="lg">
          <Stack gap="lg" aria-busy="true">
            <Skeleton lines={1} />
            <Skeleton lines={6} />
          </Stack>
        </Center>
      </ExampleShell>
    );
  }
  if (id && !existing.data) {
    return (
      <ExampleShell current={config.path} trail={trail}>
        <Center max="sm" gutters="lg">
          <EmptyState reason="no-results" headingLevel={1} title={`No such ${config.label.one.toLowerCase()}`} action={<Link href={config.path}>{`Back to ${config.label.many.toLowerCase()}`}</Link>} />
        </Center>
      </ExampleShell>
    );
  }
  return <EntityForm config={config} existing={id ? existing.data : undefined} title={title} trail={trail} {...props} />;
}

interface EntityFormProps<E extends Entity> extends Omit<EntityFormPageProps<E>, 'config' | 'id'> {
  config: EntityConfig<E>;
  existing: E | undefined;
  title: string;
  trail: { items: readonly { label: string; href: string }[]; current: string };
}

function EntityForm<E extends Entity>({ config, existing, title, trail, initialDraft, initialSubmitted = false }: EntityFormProps<E>) {
  const form = config.form;
  const tenant = useTenant();
  const currency = WORKSPACES[tenant].currency;
  const digits = currencyDigits(currency);
  const format = useFormat();
  const navigate = useNavigate();
  const people = usePeople();
  const accounts = useAccounts();
  const saver = form?.useSave(existing, digits);
  const formId = `${config.path.slice(1)}-form`;
  const empty = Object.fromEntries((form?.fields ?? []).map((f) => [f.id, ''])) as EntityDraft;
  const [draft, setDraft] = useState<EntityDraft>({ ...empty, ...(existing && form ? form.toDraft(existing, digits) : {}), ...initialDraft });
  const [touched, setTouched] = useState<Readonly<Record<string, boolean>>>({});
  const [failedSubmits, setFailedSubmits] = useState(initialSubmitted ? 1 : 0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const idempotency = useRef<{ draft: string; key: string } | undefined>(undefined);

  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  if (!form || !saver) return null;

  const errors: Partial<Record<string, string>> = {};
  for (const field of form.fields) {
    const error = field.validate?.(draft[field.id] ?? '');
    if (error) errors[field.id] = error;
  }
  const shown = (field: string) => (failedSubmits > 0 || touched[field] ? errors[field] : undefined);
  const summary = failedSubmits > 0 ? form.fields.filter((f) => errors[f.id]) : [];
  const inputId = (field: string) => `${formId}-${field}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saver.isPending) return;
    if (Object.keys(errors).length > 0) {
      setFailedSubmits((n) => n + 1);
      return;
    }
    // One key per draft: a retry of the same draft sends the same key, so the server makes one entity.
    const fingerprint = JSON.stringify(draft);
    if (idempotency.current?.draft !== fingerprint) idempotency.current = { draft: fingerprint, key: crypto.randomUUID() };
    saver.save(draft, { idempotencyKey: idempotency.current.key, onSuccess: (saved) => navigate(`${config.path}/${saved.id}`) });
  };

  const focusField = (field: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(inputId(field))?.focus();
  };

  const cancelHref = existing ? `${config.path}/${existing.id}` : config.path;
  const actions = (
    <Center max="sm" gutters="lg">
      <Cluster justify="between">
        <Link href={cancelHref}>Cancel</Link>
        <Button type="submit" form={formId} loading={saver.isPending}>
          {saver.isPending ? 'Saving…' : existing ? 'Save changes' : `Create ${config.label.one.toLowerCase()}`}
        </Button>
      </Cluster>
    </Center>
  );

  return (
    <ExampleShell current={config.path} trail={trail} footer={actions}>
      <Center max="sm" gutters="lg">
        <Stack gap="lg">
          <PageHeader title={title} />
          {isConflict(saver.error) ? (
            <Banner tone="warning" title={`Someone else changed this ${config.label.one.toLowerCase()}`}>
              Your changes weren’t saved, so nothing of theirs was overwritten. Reload the page to see their version.
            </Banner>
          ) : saver.isError ? (
            <Banner tone="danger" title="Nothing was saved">
              {saver.error instanceof Error ? saver.error.message : 'The server didn’t answer.'} Your entries are still here: try again.
            </Banner>
          ) : null}
          {summary.length > 0 ? (
            <Banner
              ref={summaryRef}
              tabIndex={-1}
              tone="danger"
              announce={false}
              title={summary.length === 1 ? 'There is 1 problem' : `There are ${String(summary.length)} problems`}
            >
              <Stack as="ul" gap="2xs">
                {summary.map((field) => (
                  <li key={field.id}>
                    <a href={`#${inputId(field.id)}`} onClick={focusField(field.id)}>
                      {errors[field.id]}
                    </a>
                  </li>
                ))}
              </Stack>
            </Banner>
          ) : null}
          <Stack as="form" id={formId} gap="lg" onSubmit={submit}>
            <Card>
              <CardBody>
                {/* The config says which fields; the field registry says how each one edits. */}
                {form.fields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    inputId={inputId(field.id)}
                    value={draft[field.id] ?? ''}
                    onChange={(value) => setDraft((current) => ({ ...current, [field.id]: value }))}
                    onBlur={() => setTouched((current) => ({ ...current, [field.id]: true }))}
                    error={shown(field.id)}
                    context={{ format, currency, people: people.data ?? [], accounts: accounts.data ?? [] }}
                  />
                ))}
              </CardBody>
            </Card>
          </Stack>
        </Stack>
      </Center>
    </ExampleShell>
  );
}
