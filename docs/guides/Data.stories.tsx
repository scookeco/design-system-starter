import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const HOMES = [
  { home: 'Local state', holds: 'What one component owns: an open menu, a half-typed search, a form draft', example: 'The rename dialog’s typed name' },
  { home: 'Lifted state', holds: 'What two parts of one page coordinate on', example: 'The list’s selection (the table and the footer bar share it)' },
  { home: 'Server cache', holds: 'Confirmed domain data, read through queries', example: 'A page of records, a record, the tab counts' },
  { home: 'URL', holds: 'What a copied link must reproduce: view, search, filters, sort, page, tab', example: '/records?view=open&q=lease&sort=-amount&page=2' },
] as const;

const MUTATIONS = [
  { verb: 'renameRecord', presents: 'Optimistic', patches: 'The record and every cached list page holding it, at once; both rolled back on failure unless a newer write landed', invalidates: 'The record, every list (counts can’t change)', failure: 'Old name back, a toast that stays, the typed name kept; a 409 shows a Banner with Reload; a 403 refreshes the session' },
  { verb: 'moveRecord', presents: 'Pessimistic', patches: 'The record and every listed copy, with the server’s answer', invalidates: 'Every list and count', failure: 'Nothing changed; a toast that stays' },
  { verb: 'archiveRecord', presents: 'Pessimistic', patches: 'The record and every listed copy, with the server’s answer', invalidates: 'Every list and count', failure: 'Nothing changed; a toast that stays' },
  { verb: 'createRecord', presents: 'Pessimistic, with an idempotency key', patches: 'The new record’s detail entry', invalidates: 'Every list and count', failure: 'The draft stays; a retry sends the same key, so no duplicate' },
  { verb: 'bulkDeleteRecords', presents: 'Pessimistic, confirmed', patches: 'Removes deleted records', invalidates: 'Every list and count', failure: 'Partial: a banner that stays (“50 deleted, 9 failed”) with Retry' },
  { verb: 'addPerson', presents: 'Pessimistic', patches: 'Appends to people', invalidates: 'People', failure: 'The dialog stays open with an error' },
  { verb: 'createAccount', presents: 'Pessimistic, with an idempotency key', patches: 'The account’s detail; appends to the directory', invalidates: 'The directory', failure: 'The form stays, with a banner' },
  { verb: 'updateAccount', presents: 'Pessimistic, versioned', patches: 'The account’s detail and its directory entry', invalidates: 'Nothing else: records hold its id, so every row re-renders from the directory', failure: 'A banner; a 409 says someone else changed it' },
  { verb: 'saveView · updateView · deleteView', presents: 'Pessimistic', patches: 'The person’s views (the default moves on update)', invalidates: 'Views', failure: 'The dialog stays open with the server’s reason' },
  { verb: 'markRead · markUnread · archive · unarchive (inbox)', presents: 'Optimistic: a person’s own frequent triage', patches: 'The items in every cached inbox view, and the counts', invalidates: 'Inbox views', failure: 'Every view put back as it was; a toast that stays' },
  { verb: 'inviteMember · changeRole · removeMember', presents: 'Pessimistic: it changes what someone else can do', patches: 'Members (the answer)', invalidates: 'Members, the audit log', failure: 'The dialog stays open with the server’s reason (last admin, your own role, already a member)' },
] as const;

const ROLES = [
  { role: 'Viewer', holds: 'workspace:read, record:read, account:read', sees: 'Records minus drafts (filtered in the query); no New record, no Move to…, no Rename or Archive' },
  { role: 'Editor', holds: 'Viewer’s, plus record:read-drafts, record:create, rename, move, archive, account:create, people:create', sees: 'Everything; Delete disabled (“Only workspace admins can delete records.”), account Edit disabled' },
  { role: 'Admin', holds: 'Editor’s, plus workspace:manage, record:delete, account:edit, members:manage, audit:read', sees: 'Everything, including the audit log; invites, changes and removes members' },
] as const;

function DataPage() {
  return (
    <DocPage
      title="Data"
      lead="The design system draws; the app layer knows. Everything about fetching, caching, validating and writing data lives in src/app, which the golden examples use and the system never imports."
    >
      <DocSection title="Why the system stays UI-only">
        <Rules
          items={[
            <>
              The system’s runtime dependencies are exactly <code>react</code>, <code>react-dom</code>, <code>radix-ui</code> and{' '}
              <code>react-aria-components</code> (with its date library, <code>@internationalized/date</code>), all UI. A unit test fails
              the build if that list changes.
            </>,
            <>
              Data libraries (<code>msw</code>, <code>@tanstack/react-query</code>, <code>zod</code>) are devDependencies. ESLint rejects
              them, and any import from <code>src/app</code>, in <code>src/components</code>, <code>src/primitives</code> and{' '}
              <code>src/layouts</code>, with a fixture per boundary in <code>npm run test:rules</code>.
            </>,
            <>
              So components take values and callbacks, never queries. An app is free to choose another cache or another server, and the
              system doesn’t change.
            </>,
            <>
              The one data-shaped part the system does ship is formatting: <code>LocaleProvider</code> and <code>useFormat()</code>. Every
              number, date and amount a person reads goes through it.
            </>,
          ]}
        />
        <Code label="The layers">{`
tokens → primitives → components → layouts        the design system (src/index.ts)
                                         ↑
src/app   api/        the client and zod schemas: every response is parsed at the boundary
          model/      cache keys, queries, named predicates, projections, mutations, selection,
                      permissions (the role → capability mapping and the one predicate, can)
          session.tsx the session: memberships, the active workspace, switch, sign out
          routing/    the route entry type, the matcher, RouteView and AppLink
          url/        useUrlState and the list page's URL codec
          registries/ the field registry, which fields a record has, entityType → fields
          mocks/      the mock API (MSW), its seeded database and gallery wiring
                                         ↑
src/examples          golden pages: compose the system, read and write through src/app
`}</Code>
      </DocSection>

      <DocSection title="The cache model">
        <Rules
          items={[
            <>
              One server cache (TanStack Query), chosen on purpose: this is server-driven CRUD with server-side search, filter, sort and
              paging. A normalized store would earn its cost only if many views edited the same entities at once.
            </>,
            <>
              Keys are <code>[tenant, scope, resource, params]</code>: <code>['acme', 'admin', 'records', {'{ view, q, status, sort, page }'}]</code>,{' '}
              <code>['acme', 'admin', 'record', {'{ id }'}]</code>. The partition (the workspace, then the permission scope the server
              answered for) leads every key, so one workspace’s data can never answer for another’s, a viewer never reads what an admin
              cached, and invalidation can be as narrow as one resource in one partition.
            </>,
            <>
              A query cache doesn’t normalize: a record also lives inside every cached list page that holds it. So a record write patches
              the detail <em>and</em> every listed copy (<code>patchListedRecord</code>, one <code>setQueriesData</code> over the lists
              prefix), then invalidates what the patch can’t know (membership, order, totals). A test holds every list request open and still
              sees the edit in the mounted list and in an unmounted page of another tab.
            </>,
            <>
              Only trusted data enters the cache. Every response is parsed with a zod schema in <code>src/app/api/client.ts</code>. A payload
              that breaks the contract is reported and becomes the page’s error state; it never reaches the cache (see{' '}
              <StoryLink id="examples-list-page--invalid-payload">the invalid payload story</StoryLink>).
            </>,
            <>
              Views are projections, never copies: rows are <code>toRow(record)</code>. “What counts as open” is one predicate,{' '}
              <code>isOpen</code>. The Open tab, its count, the filter options, the badges, the bulk-delete guard (<code>canDelete</code>)
              and the mock server all call the same functions, so they can’t disagree.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Entities and joins">
        <Rules
          items={[
            <>
              Three entities: records, accounts and people. A record holds <code>ownerId</code> and <code>accountId</code>, never a copy of a
              name. Accounts and people are reference data, loaded whole into one directory query each.
            </>,
            <>
              Every name on screen is joined by id at render: <code>PersonRef</code> and <code>AccountRef</code> (and the registry’s{' '}
              <code>person</code> and <code>account</code> field types) read the directory. Rename an account once and every row, card and
              property that shows it changes, with no list touched.
            </>,
            <>
              The server joins too: search matches the owner’s name, looked up by id before the one <code>matchesSearch</code> predicate
              runs, so client and server still agree about what matches.
            </>,
            <>
              A related-entity section is a join projection: an account’s page lists <code>useRecordList({'{ account: id }'})</code>, through
              the same <code>toRow</code>, with rollups from the same counts as the tabs. Navigation goes both ways by id.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="One projection, many surfaces">
        <Rules
          items={[
            <>
              The list’s table and board are two surfaces over one query and one projection. The board groups the same rows by per-status
              predicates (<code>toBoard</code>, <code>hasStatus</code>); its columns are the statuses the tab’s predicate lets through,
              narrowed by the status filter; its column totals are per-status counts the server returns beside the tab counts.
            </>,
            <>
              The display is URL state (<code>display=board</code>), pushed so Back returns to the table. A new surface (a calendar, a
              timeline) is a new entry in <code>DISPLAYS</code> and a component, never a page with its own store.
            </>,
            <>
              Every card has a Move to… menu, so the board works from the keyboard. Dragging a card onto a column does the same, and
              declares the menu as its alternative (<code>data-drag-alternative</code>, enforced by ESLint).
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Permissions">
        <Code label="One mapping, one predicate, four call sites">{`
role ──(ROLE_CAPABILITIES, src/app/model/permissions.ts)──▶ capabilities ──▶ can(grant, capability, subject?)
                                                                              ├─ control: shown / disabled with the reason
                                                                              ├─ route guard: page / 403 page
                                                                              ├─ mutation: sends / refuses (403) without a request
                                                                              └─ mock server: 200 / 403, whatever the client did
`}</Code>
        <Table caption="Roles">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Holds</TableHeaderCell>
              <TableHeaderCell>In the examples</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ROLES.map((r) => (
              <TableRow key={r.role}>
                <TableCell rowHeader>{r.role}</TableCell>
                <TableCell>{r.holds}</TableCell>
                <TableCell>{r.sees}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Rules
          items={[
            <>
              Capabilities are <code>resource:action</code> strings. Roles map to them in exactly one place, and the session carries each
              membership’s capabilities as the server derived them. The client never decides anything from a role name.
            </>,
            <>
              <code>can</code> checks the capability, then the object rule for the thing acted on (an archived record can’t be renamed; one
              on legal hold can’t be deleted), from the same named predicates as everything else.
            </>,
            <>
              One rule per context: page and bar actions are disabled, with the reason as visible text they point at (
              <code>aria-describedby</code>); overflow-menu items and card actions are hidden; a route the role can’t open renders the 403
              page. Never a silent redirect.
            </>,
            <>
              Roles shape projections too: a viewer’s lists have no drafts, filtered by the server in the query, so pages and totals stay
              honest. The Drafts tab needs <code>record:read-drafts</code>.
            </>,
            <>
              The gallery’s <strong>Role</strong> toolbar switches between viewer, editor and admin (default admin). A story that sets{' '}
              <code>mockApi({'{ role }'})</code> wins, and the visual suite pins <code>role:admin</code>. See{' '}
              <StoryLink id="examples-list-page--as-viewer">the viewer’s list</StoryLink> and{' '}
              <StoryLink id="examples-record-page--rename-forbidden">a forced 403</StoryLink>.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Workspace and session boundaries">
        <Rules
          items={[
            <>
              <strong>Switch workspace</strong> (the account menu): in-flight reads of the old workspace are cancelled, its confirmed data
              stays under its own keys, and the page remounts, so selections and drafts stay behind. A late answer never reaches the new
              screen.
            </>,
            <>
              <strong>Permission change</strong> (a new session, or <code>refreshSession</code> after a 403): the old scope’s partition is
              dropped, and a list never keeps the previous page on screen across partitions (<code>keepPreviousData</code> would otherwise
              show an admin’s rows to a viewer until the viewer’s arrived).
            </>,
            <>
              <strong>Sign out</strong>: every query and mutation is cancelled and the whole cache cleared before the signed-out screen
              renders. The server ends the session; every later request is a 401.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Routes">
        <Rules
          items={[
            <>
              The route table is the master registry: <code>path → layout + page + guard</code> (<code>src/examples/routes.tsx</code>). A
              route without a capability doesn’t compile, and a test checks every route has one.
            </>,
            <>
              Pages are lazy, one chunk per route. The Suspense fallback is nothing: a page shows its own skeleton once its code is here.
            </>,
            <>
              An unknown path renders the 404 page, the table’s own fallback. The app hands the design system its router link once (
              <code>LinkProvider</code> with <code>AppLink</code>), so every Link, Nav, NavTabs and Breadcrumbs routes in place.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Where state lives">
        <Table caption="State homes">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Home</TableHeaderCell>
              <TableHeaderCell>Holds</TableHeaderCell>
              <TableHeaderCell>In the list and record pages</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {HOMES.map((h) => (
              <TableRow key={h.home}>
                <TableCell rowHeader>{h.home}</TableCell>
                <TableCell>{h.holds}</TableCell>
                <TableCell>{h.example}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Rules
          items={[
            <>
              <code>useUrlState(codec)</code> reads and writes a validated query string. The codec never throws: an unknown view, sort or
              status falls back to its default, so a stale or hand-edited link still opens a sensible view.
            </>,
            <>
              History is decided per write. <strong>Push</strong> for navigation (a tab, a page), so Back returns there. <strong>Replace</strong>{' '}
              for refinements (a filter, a sort, the search once typing pauses for 300 ms), so Back never steps through keystrokes.
            </>,
            <>
              Ids go in the URL, never the data behind them or anything personal. The half-typed search stays local until it’s committed.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Writes: one named mutation per verb">
        <Text>
          Components never write the cache. They call a mutation from <code>src/app/model/mutations.ts</code>, named for the domain verb.
          How it presents depends on whether failure is cheap to reverse: optimistic for a person’s own frequent edit, pessimistic when
          the server decides or the change is hard to take back.
        </Text>
        <Table caption="The mutation matrix">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Mutation</TableHeaderCell>
              <TableHeaderCell>Presents</TableHeaderCell>
              <TableHeaderCell>Patches</TableHeaderCell>
              <TableHeaderCell>Invalidates</TableHeaderCell>
              <TableHeaderCell>On failure</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MUTATIONS.map((m) => (
              <TableRow key={m.verb}>
                <TableCell rowHeader>
                  <code>{m.verb}</code>
                </TableCell>
                <TableCell>{m.presents}</TableCell>
                <TableCell>{m.patches}</TableCell>
                <TableCell>{m.invalidates}</TableCell>
                <TableCell>{m.failure}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Rules
          items={[
            <>An optimistic write cancels in-flight reads first, so a late response can’t land on top of it.</>,
            <>
              Edits send the version they were based on. The server answers <code>409</code> if someone changed the record since, and the
              page says so instead of silently overwriting their change.
            </>,
            <>A pending write disables the controls that would start it again. Errors that need action stay on screen until dismissed.</>,
            <>
              See them on the <StoryLink id="examples-record-page--rename-pending">record page</StoryLink> (rename pending, succeeded,
              failed and rolled back, conflict; archive pending) and the <StoryLink id="examples-create-and-edit--create-failed">create
              form</StoryLink>.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Selection and bulk actions">
        <Rules
          items={[
            <>
              A checkbox per row, named after the row (<code>Checkbox hideLabel</code>, “Select Hardware lease”); selected rows are filled (
              <code>TableRow selected</code>).
            </>,
            <>
              The header box selects the page, then offers “Select all N matching”. That selection is the <em>filter</em>, sent to the server
              as a filter, never as a list of ids it would have to load.
            </>,
            <>A selection belongs to one filter: change the search, a filter or the view and it clears. Paging and sorting keep it.</>,
            <>
              While anything is selected the shell’s sticky footer shows the count (announced politely), Clear selection, and Delete
              last, disabled when the <code>canDelete</code> predicate rules every selected row out.
            </>,
            <>
              Delete asks with the count in the question. A partial failure stays on screen (“50 deleted, 9 failed”) with the reasons and
              Retry. See <StoryLink id="examples-list-page--bulk-delete-partial-failure">the partial failure story</StoryLink>.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Registries: fields as config">
        <Rules
          items={[
            <>
              <code>src/app/registries/entities.ts</code> maps each entity type to its fields: list columns, record properties, related
              records, and its create and edit form. Generic list, record and form pages (<code>src/examples/EntityPages.tsx</code>) render
              any entry, so accounts and people have no hand-built pages.
            </>,
            <>
              <code>src/app/registries/fields.tsx</code> maps each field type (<code>text</code>, <code>money</code>, <code>date</code>,{' '}
              <code>status</code>, <code>person</code>, <code>tags</code>) to how it displays and how it edits. <code>RECORD_PROPERTIES</code>{' '}
              drives the record page’s properties; <code>CREATE_FIELDS</code> drives the create form. One registry, two surfaces.
            </>,
            <>
              A new field is one line of config. A new field type is one registry entry: the registry is keyed on the type union, so a
              missing entry fails to compile.
            </>,
            <>
              Data can still be newer than the code. A field whose type has no entry renders “Not available” and is reported once. It never
              throws.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Saved views">
        <Rules
          items={[
            <>
              A saved view is config: the tab, search, status filter, sort, visible columns and display, the same state the URL already
              holds. The mock API stores views per person per workspace, with one default each.
            </>,
            <>
              The URL stays the truth. Choosing a view pushes its config and <code>saved=&lt;id&gt;</code>; changing anything after that
              shows “Modified” until it’s saved into the view or saved as a new one.
            </>,
            <>
              The default view applies only when the list opens with nothing in its URL, with replace: a shared link always wins, and Back
              never returns to the bare URL.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="The mock API and the gallery">
        <Rules
          items={[
            <>
              Stories and tests talk to a real HTTP mock (MSW) over a seeded, deterministic database: 240 and 120 records for two tenants,
              the same on every run.
            </>,
            <>
              The toolbar’s <strong>Latency</strong> and <strong>Failures</strong> controls change how the mock server behaves. Failures are
              real 500 responses through the real client, so the error states you see are the ones users would.
            </>,
            <>
              The visual suite pins latency and failures to 0 in the story URL, freezes the page clock at the instant the data was seeded
              for (so “3 days ago” holds), and waits for <code>html[data-queries-settled=&quot;true&quot;]</code> on stories tagged{' '}
              <code>data</code>. A story that holds a request open on purpose (a loading or pending state) is tagged <code>busy</code>.
            </>,
            <>
              Per-story server behaviour comes from <code>src/app/mocks/overrides.ts</code>: <code>hold</code>, <code>fail</code>,{' '}
              <code>emptyWorkspace</code>, <code>malformed</code>. The database is reset before every story.
            </>,
          ]}
        />
        <Code label="A story file that reads from the mock API">{`
const meta = {
  title: 'Examples/List page',
  component: ListPage,
  tags: ['!autodocs', 'data'],   // written out: Storybook reads tags statically
  ...mockApiMeta,                // providers, handlers, a fresh database per story
} satisfies Meta<typeof ListPage>;

export const LoadError: Story = { parameters: mswOverrides(fail('get', '/records')) };
export const Loading: Story = { tags: ['busy'], parameters: mswOverrides(hold('get', '/records')) };
export const Linked: Story = { parameters: mockApi({ url: '/records?view=open&q=lease' }) };
`}</Code>
      </DocSection>

      <DocSection title="The audit log">
        <Rules
          items={[
            <>
              Every admin write emits an audit event where it’s written (the mock server’s member handlers), denied attempts included: the log
              is a projection of the mutations, not something each page remembers. Actions are <code>resource.verb</code> (
              <code>member.role_changed</code>), one per named mutation.
            </>,
            <>
              An event is a snapshot, not a join: it records the actor’s and target’s names as they were. People leave and records are deleted;
              the log must still say who did what. It is the one place names are copied.
            </>,
            <>
              A date filter is calendar dates in the URL and instants on the wire: <code>dayRangeToInstants</code> turns “Sep 1 – Sep 25” into
              the start of the first day and the start of the day after the last in the reader’s time zone (from <code>useFormat()</code>),
              daylight-saving changes included. Never UTC midnight.
            </>,
            <>Record writes don’t emit events yet (their handlers are shared with other work); the seeded history includes them.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Adding an entity">
        <Rules
          items={[
            <>Its schema in <code>src/app/api/schemas.ts</code>, and its endpoints (the tenant first) in their own file in <code>api/</code>.</>,
            <>References to other entities as ids, displayed through a ref component or a ref field type: never a copied name.</>,
            <>Its predicates in <code>src/app/model</code>; its projections for lists.</>,
            <>
              Its keys (under the partition), queries and named mutations, each mutation with its row in the matrix above, refusing without its
              capability. A domain added beside the records (the inbox, the admin console) keeps them together in its own module (
              <code>src/app/model/inbox.ts</code>, <code>admin.ts</code>), with its contract beside its endpoints in <code>src/app/api</code>.
            </>,
            <>Its capabilities in <code>CAPABILITIES</code>, their roles in <code>ROLE_CAPABILITIES</code>, and the same capability on its mock routes.</>,
            <>Its entry in <code>entities.ts</code> (fields, related records, form) and its rows in the route table, each with a guard.</>,
            <>Mock handlers and seed data (from its own PRNG stream) so its stories and tests run.</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Data', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const DataGuide: StoryObj = { name: 'Data', render: () => <DataPage /> };
