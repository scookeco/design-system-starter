import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const ARCHETYPES = [
  {
    archetype: 'List / index',
    file: 'src/examples/ListPage.tsx',
    id: 'examples-list-page--default',
    example: 'List page',
    choose: 'Users come to find, compare or act on many records: records, people, invoices, an audit log.',
    shows: 'PageHeader with one primary action, saved views (save, rename, default, delete; “Modified”), view tabs with server counts, SearchField, a Filters popover with removable chips and a Columns popover, a Table · Board switch over one query (the board keyboard-operable, with a Move to… menu), Pagination; everything in the URL; row selection with “Select all N matching” and a bulk bar; actions disabled with a reason per role; loading, first use, no results and load error states.',
  },
  {
    archetype: 'Record / detail',
    file: 'src/examples/RecordPage.tsx',
    id: 'examples-record-page--default',
    example: 'Record page',
    choose: 'One record is the subject: its status, properties, activity and the actions on it.',
    shows: 'Breadcrumb, PageHeader with status and a “More” menu, NavTabs for Overview · Activity · Files, a properties aside rendered from the field registry; an optimistic rename with rollback and a conflict banner, a pessimistic archive.',
  },
  {
    archetype: 'Create and edit',
    file: 'src/examples/CreateEditFlow.tsx',
    id: 'examples-create-and-edit--empty',
    example: 'Create and edit',
    choose: 'Someone fills in a record: a full page for heavy records, a quick-create dialog for light ones.',
    shows: 'Errors on blur and submit, a focused error summary linking to fields, registry-rendered fields, a pending submit in the sticky action bar, a create that is safe to retry (idempotency key).',
  },
  {
    archetype: 'Entity list, record and form (schema-driven)',
    file: 'src/examples/EntityPages.tsx',
    id: 'examples-entity-pages--account-record',
    example: 'Entity pages',
    choose: 'A second or third entity (accounts, people, vendors) whose pages fit the list, record and form archetypes: write its config, not its pages.',
    shows: 'List, record and form rendered from an entity config (src/app/registries/entities.ts) through the field registry: a properties rail, the records that point at it by id with rollups, Edit disabled with a reason, create and edit with a focused error summary.',
  },
  {
    archetype: 'The app and its routes',
    file: 'src/examples/App.tsx',
    id: 'examples-app--records',
    example: 'App',
    choose: 'Wiring pages together: which page a URL opens, who may open it, and what an unknown URL shows.',
    shows: 'The route table (path → layout + page + guard), lazy pages, LinkProvider with the app’s router link, a 403 page from the guard and the 404 fallback.',
  },
  {
    archetype: 'Settings',
    file: 'src/examples/SettingsPage.tsx',
    id: 'examples-settings-page--personal-profile',
    example: 'Settings page',
    choose: 'Personal or workspace preferences, grouped by category.',
    shows: 'A grouped sub-nav in PageLayout’s nav slot, one card per category with its own Save, a success banner.',
  },
  {
    archetype: 'Sign-in (signed out)',
    file: 'src/examples/SignInPage.tsx',
    id: 'examples-sign-in--start',
    example: 'Sign in',
    choose: 'Any signed-out page: sign-in, sign-up, password reset, a verification code.',
    shows: 'AuthLayout; SSO first, an emailed link, a password as the secondary route; a failed-sign-in banner; a verification-code step.',
  },
  {
    archetype: 'Wizard',
    file: 'src/examples/SetupWizard.tsx',
    id: 'examples-setup-wizard--first-step',
    example: 'Setup wizard',
    choose: 'A task whose later steps depend on earlier ones: first-run setup, a multi-step create.',
    shows: 'FocusedLayout with an exit, Progress and Stepper; validation per step; focus to each step’s h1; a review step with Edit.',
  },
  {
    archetype: 'Dashboard',
    file: 'src/examples/DashboardPage.tsx',
    id: 'examples-dashboard--default',
    example: 'Dashboard',
    choose: 'A home or overview page: how things are, and what needs attention.',
    shows: 'A date range (SegmentedControl) in the PageHeader, Stat tiles in a Switcher, usage Meters, recent activity, a needs-attention table.',
  },
  {
    archetype: 'Error and 404',
    file: 'src/examples/ErrorPages.tsx',
    id: 'examples-error-pages--not-found',
    example: 'Error pages',
    choose: 'A page that doesn’t exist (inside the shell), or a failure before the app can load (in AuthLayout).',
    shows: 'EmptyState as the h1, plain words, Try again and a way home; a 403 page for a route the role can’t open, saying who can change that.',
  },
] as const;

function PageArchetypes() {
  return (
    <DocPage
      title="Page archetypes"
      lead="Most pages are one of a few archetypes. Each has one golden example: copy it, swap the nouns, keep the structure and the states. Don’t copy another screen."
    >
      <DocSection title="Which example to copy">
        <Table caption="Archetypes and their examples">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Archetype</TableHeaderCell>
              <TableHeaderCell>Choose when</TableHeaderCell>
              <TableHeaderCell>Copy</TableHeaderCell>
              <TableHeaderCell>It shows</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ARCHETYPES.map((a) => (
              <TableRow key={a.archetype}>
                <TableCell rowHeader>{a.archetype}</TableCell>
                <TableCell>{a.choose}</TableCell>
                <TableCell>
                  <StoryLink id={a.id}>{a.example}</StoryLink>
                  <Text size="caption" tone="muted">
                    <code>{a.file}</code>
                  </Text>
                </TableCell>
                <TableCell>{a.shows}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="How to copy one">
        <Rules
          items={[
            <>
              Signed-in pages render inside the app’s one shell composition (the examples share <code>ExampleShell</code>); signed-out pages
              in AuthLayout; a focused multi-step task in FocusedLayout. Every page starts with a <code>PageHeader</code>.
            </>,
            <>Keep every state the example has: loading, empty, error. A page without them isn’t finished.</>,
            <>
              Read and write through the app layer, as the list, record and create examples do: queries and named mutations from{' '}
              <code>src/app/model</code>, never a fetch in a page. See the Data guide.
            </>,
            <>
              Map domain statuses to badge tones in one place (<code>src/app/model/status.ts</code>), and define each “what counts as X” as
              one named predicate.
            </>,
            <>Format every number, date and amount with <code>useFormat()</code>; never by hand.</>,
            <>
              A new page is a row in the route table (<code>src/examples/routes.tsx</code>) with the capability that guards it. A new entity
              that fits the list, record and form archetypes is an entry in <code>src/app/registries/entities.ts</code>, not three new pages.
            </>,
            <>
              Ask <code>can</code> (through <code>useCan</code> or <code>usePermission</code>) before showing an action: disable page and bar
              actions with the reason beside them, hide overflow-menu items and card actions. The mutation and the server refuse as well.
            </>,
            <>A page that fits no archetype is rare. Check the list again, then raise it: it may need a new golden example, not a one-off.</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Page archetypes', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const PageArchetypesGuide: StoryObj = { name: 'Page archetypes', render: () => <PageArchetypes /> };
