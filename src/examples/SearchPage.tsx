/**
 * GOLDEN EXAMPLE: search results (the whole workspace: records, accounts and people). The command
 * palette answers "take me to X" in five rows; this page answers "show me everything that matches",
 * and the palette's "See all results" row opens it with the query. No CSS file, no className, no style.
 *
 * Anatomy:
 *   shell    no nav item is current (search belongs to every section)
 *   header   PageHeader: "Search" · how many results, in words (announced)
 *   search   SearchField in a role="search" form: the URL follows once typing pauses (replace)
 *   types    NavTabs with server counts per type: All · Records · Accounts · People (push)
 *   refine   PageLayout's aside: record statuses with counts (replace), shown when records are in view
 *   results  an ordered list, best match first: the name as a link with the matched text in <strong>,
 *            the type and a second line (owner and account, domain, email), a record's status badge
 *   paging   Pagination, in the URL
 *
 * Everything that decides what matches is on the server, with the same folding rules as the list
 * and the palette (src/app/model/searchRules.ts), and only what this person may open is returned.
 *
 * Keyboard, like the inbox and the palette: / puts the cursor in the search field, J and K move
 * through the results (focus follows), Enter opens one. Every key is in the ? overlay.
 */
import { useCallback, useState } from 'react';
import {
  Badge,
  Banner,
  Button,
  Center,
  Checkbox,
  Cluster,
  EmptyState,
  Kbd,
  Link,
  NavTabs,
  PageHeader,
  PageLayout,
  Pagination,
  SearchField,
  Skeleton,
  Stack,
  Text,
  useFormat,
  useShortcut,
} from '../index';
import { SEARCH_TYPES, type SearchHit, type SearchType } from '../app/api/search';
import { RECORD_STATUSES, type RecordStatus } from '../app/api/schemas';
import { highlightParts, MIN_QUERY } from '../app/model/searchRules';
import { STATUS } from '../app/model/status';
import { useWorkspaceSearch } from '../app/model/workspaceSearch';
import { searchCodec } from '../app/url/searchState';
import { useDebouncedUrlText, useUrlState } from '../app/url/useUrlState';
import { ExampleShell } from './ExampleShell';

const PAGE_SIZE = 20;
const FIELD_ID = 'search-page-field';
const resultId = (hit: Pick<SearchHit, 'type' | 'id'>) => `search-result-${hit.type}-${hit.id}`;

const TYPE_LABEL: Record<SearchType, { one: string; many: string }> = {
  record: { one: 'Record', many: 'Records' },
  account: { one: 'Account', many: 'Accounts' },
  person: { one: 'Person', many: 'People' },
};

const HREF: Record<SearchType, (id: string) => string> = {
  record: (id) => `/records/${id}`,
  account: (id) => `/accounts/${id}`,
  person: (id) => `/people/${id}`,
};

/** Statuses a search can narrow to: archived records aren't searched, as the list's All tab leaves them out. */
const FACET_STATUSES = RECORD_STATUSES.filter((s) => s !== 'archived');

/** Text with the matched parts in <strong>: emphasis a screen reader can announce, in the text colour. */
function Highlighted({ text, ranges }: { text: string; ranges: readonly [number, number][] }) {
  return (
    <>
      {highlightParts(text, ranges).map((part, i) => (part.match ? <strong key={i}>{part.text}</strong> : part.text))}
    </>
  );
}

export function SearchPage() {
  return (
    <ExampleShell current="">
      <Center max="lg" gutters="lg">
        <SearchContent />
      </Center>
    </ExampleShell>
  );
}

function SearchContent() {
  const format = useFormat();
  const [url, nav] = useUrlState(searchCodec);
  const commit = useCallback((q: string) => nav.replace({ q, page: 1 }), [nav]);
  const [text, setText] = useDebouncedUrlText(url.q, commit);
  const query = { q: url.q.trim(), type: url.type, status: url.status, page: url.page, pageSize: PAGE_SIZE };
  const results = useWorkspaceSearch(query);
  const [focused, setFocused] = useState(-1);

  const items = results.data?.items ?? [];
  const searching = query.q.length >= MIN_QUERY;
  const showStatuses = url.type === '' || url.type === 'record';
  const filtered = url.status.length > 0;

  const focusResult = (index: number) => {
    const hit = items[index];
    if (!hit) return;
    setFocused(index);
    document.getElementById(resultId(hit))?.focus();
  };
  /** Move from the focused result (or the last one moved to): j and k, like the inbox. */
  const move = (by: number) => {
    const current = items.findIndex((hit) => document.activeElement?.id === resultId(hit));
    const from = current === -1 ? focused : current;
    focusResult(from === -1 && by < 0 ? 0 : Math.min(items.length - 1, Math.max(0, from + by)));
  };
  useShortcut({ id: 'search.focus', keys: '/', description: 'Search', scope: 'Search', handler: () => document.getElementById(FIELD_ID)?.focus() });
  useShortcut({ id: 'search.next', keys: 'j', description: 'Next result', scope: 'Search', handler: () => move(1), enabled: items.length > 0 });
  useShortcut({ id: 'search.previous', keys: 'k', description: 'Previous result', scope: 'Search', handler: () => move(-1), enabled: items.length > 0 });

  const typeCount = (type: SearchType | '') => {
    const facets = results.data?.facets.types;
    if (!facets) return undefined;
    return type === '' ? SEARCH_TYPES.reduce((sum, t) => sum + facets[t], 0) : facets[type];
  };
  const tabLabel = (type: SearchType | '') => {
    const label = type === '' ? 'All' : TYPE_LABEL[type].many;
    const count = typeCount(type);
    return searching && count !== undefined ? `${label} (${format.number(count)})` : label;
  };
  const toggleStatus = (status: RecordStatus, on: boolean) =>
    nav.replace({ status: on ? [...url.status, status] : url.status.filter((s) => s !== status), page: 1 });

  const total = results.data?.total ?? 0;
  const summary = !searching
    ? 'Records, accounts and people, by name, owner, domain or email.'
    : results.data
      ? `${format.number(total)} ${total === 1 ? 'result' : 'results'} for “${query.q}”`
      : 'Searching…';

  const body = !searching ? (
    <EmptyState
      reason="first-use"
      title={query.q.length === 0 ? 'Search the workspace' : `Type at least ${format.number(MIN_QUERY)} characters`}
      description="Find records by name or owner, accounts by name or domain, and people by name or email. Press / to start typing."
      headingLevel={2}
    />
  ) : results.isPending ? (
    <Skeleton shape="text" lines={8} />
  ) : results.isError ? (
    <Banner
      tone="danger"
      title="Search didn’t load"
      action={
        <Button variant="secondary" onClick={() => void results.refetch()}>
          Try again
        </Button>
      }
    >
      Check your connection and try again.
    </Banner>
  ) : items.length === 0 ? (
    <EmptyState
      reason="no-results"
      title={`No results for “${query.q}”`}
      description={filtered || url.type ? 'Nothing matches with these filters. Clear them to search everything.' : 'Check the spelling, or search for part of a name.'}
      action={
        filtered || url.type ? (
          <Button variant="secondary" onClick={() => nav.replace({ type: '', status: [], page: 1 })}>
            Clear filters
          </Button>
        ) : undefined
      }
      headingLevel={2}
    />
  ) : (
    <Stack gap="md">
      <Stack as="ol" role="list" gap="md" aria-label="Results">
        {items.map((hit) => (
          <Stack as="li" gap="2xs" key={`${hit.type}-${hit.id}`}>
            <Cluster gap="xs" align="center">
              <Link id={resultId(hit)} href={HREF[hit.type](hit.id)}>
                <Highlighted text={hit.title} ranges={hit.titleMatches} />
              </Link>
              {hit.status ? <Badge tone={STATUS[hit.status].tone}>{STATUS[hit.status].label}</Badge> : null}
            </Cluster>
            <Text size="caption" tone="muted">
              {TYPE_LABEL[hit.type].one}
              {hit.detail ? ' · ' : ''}
              <Highlighted text={hit.detail} ranges={hit.detailMatches} />
            </Text>
          </Stack>
        ))}
      </Stack>
      <Pagination
        label="Search results pages"
        page={url.page}
        pageSize={PAGE_SIZE}
        total={total}
        formatNumber={format.number}
        onPageChange={(page) => {
          nav.push({ page });
          setFocused(-1);
        }}
      />
    </Stack>
  );

  const refine =
    searching && showStatuses && results.data ? (
      <Stack role="group" aria-labelledby="search-status-facet" gap="xs">
        <Text as="span" id="search-status-facet" size="caption" tone="muted">
          Record status
        </Text>
        {FACET_STATUSES.map((status) => (
          <Checkbox
            key={status}
            label={`${STATUS[status].label} (${format.number(results.data.facets.statuses[status])})`}
            checked={url.status.includes(status)}
            onCheckedChange={(checked) => toggleStatus(status, checked === true)}
          />
        ))}
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={() => nav.replace({ status: [], page: 1 })}>
            Clear status
          </Button>
        ) : null}
      </Stack>
    ) : null;

  const tabs: readonly (SearchType | '')[] = ['', ...SEARCH_TYPES];

  return (
    <Stack gap="lg">
      <PageHeader title="Search" description={<span role="status">{summary}</span>} />
      <Stack gap="sm">
        <Cluster as="form" role="search" gap="sm" align="end" onSubmit={(event) => event.preventDefault()}>
          <SearchField id={FIELD_ID} label="Search the workspace" value={text} onValueChange={setText} />
        </Cluster>
        <Text size="caption" tone="muted">
          <Kbd keys="/" /> search · <Kbd keys="j" /> <Kbd keys="k" /> next and previous result · <Kbd keys="?" /> all shortcuts
        </Text>
      </Stack>
      <NavTabs
        label="Result types"
        items={tabs.map((type) => ({ label: tabLabel(type), href: nav.href({ type, status: type === 'record' || type === '' ? url.status : [], page: 1 }) }))}
        current={nav.href({ type: url.type, status: url.status, page: 1 })}
        onNavigate={(href) => nav.push(searchCodec.parse(href.slice(href.indexOf('?') + 1)))}
      />
      {refine ? (
        <PageLayout aside={refine} asideLabel="Refine results">
          {body}
        </PageLayout>
      ) : (
        body
      )}
    </Stack>
  );
}
