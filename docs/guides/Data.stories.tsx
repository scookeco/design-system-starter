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
  { verb: 'renameRecord', presents: 'Optimistic', patches: 'The record, at once; rolled back on failure unless a newer write landed', invalidates: 'The record, every list (counts can’t change)', failure: 'Old name back, a toast that stays, the typed name kept; a 409 shows a Banner with Reload' },
  { verb: 'archiveRecord', presents: 'Pessimistic', patches: 'The record, with the server’s answer', invalidates: 'Every list and count', failure: 'Nothing changed; a toast that stays' },
  { verb: 'createRecord', presents: 'Pessimistic, with an idempotency key', patches: 'The new record’s detail entry', invalidates: 'Every list and count', failure: 'The draft stays; a retry sends the same key, so no duplicate' },
  { verb: 'bulkDeleteRecords', presents: 'Pessimistic, confirmed', patches: 'Removes deleted records', invalidates: 'Every list and count', failure: 'Partial: a banner that stays (“50 deleted, 9 failed”) with Retry' },
  { verb: 'addPerson', presents: 'Pessimistic', patches: 'Appends to people', invalidates: 'People', failure: 'The dialog stays open with an error' },
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
              The system’s runtime dependencies are exactly <code>react</code>, <code>react-dom</code> and <code>radix-ui</code>. A unit
              test fails the build if that list changes.
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
          model/      cache keys, queries, named predicates, projections, mutations, selection
          url/        useUrlState and the list page's URL codec
          registries/ the field registry and which fields a record has
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
              Keys are <code>[tenant, resource, params]</code>: <code>['acme', 'records', {'{ view, q, status, sort, page }'}]</code>,{' '}
              <code>['acme', 'record', {'{ id }'}]</code>. The tenant leads every key and every request path, so one workspace’s data can
              never answer for another’s, and invalidation can be as narrow as one resource in one tenant.
            </>,
            <>
              A query cache doesn’t normalize: patching a record doesn’t update a list that contains it. That’s why each mutation says which
              lists and counts it invalidates (below).
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

      <DocSection title="Adding an entity">
        <Rules
          items={[
            <>Its schema in <code>src/app/api/schemas.ts</code>, and its endpoints (the tenant first) beside the record ones.</>,
            <>Its predicates and status map in <code>src/app/model</code>; its projections for lists.</>,
            <>Its keys, queries and named mutations, each mutation with its row in the matrix above.</>,
            <>Its field definitions for the record page and the form; registry entries only for genuinely new field types.</>,
            <>Its URL codec if it has a list; mock handlers and seed data so its stories and tests run.</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Data', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const DataGuide: StoryObj = { name: 'Data', render: () => <DataPage /> };
