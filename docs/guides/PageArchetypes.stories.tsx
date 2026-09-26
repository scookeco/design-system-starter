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
    archetype: 'Inbox / queue',
    file: 'src/examples/InboxPage.tsx',
    id: 'examples-inbox--conversation-open',
    example: 'Inbox',
    choose: 'Working through items one at a time: an inbox, a review queue, approvals, support tickets.',
    shows: 'A SplitView of the list and the open item (one pane on a narrow screen), the tab and open item in the URL, keyboard triage from the shortcut registry (j/k, e, u, x, o) mirrored by a toolbar, a row context menu and a bulk toolbar; unread state; optimistic triage with rollback; loading, empty and error states.',
  },
  {
    archetype: 'Admin console',
    file: 'src/examples/AdminConsole.tsx',
    id: 'examples-admin-console--members',
    example: 'Admin console',
    choose: 'Workspace administration: members and roles, the audit log, and the enterprise controls that grow around them.',
    shows: 'Members (invite, change role with a review of the capabilities it adds and removes, remove; your own role and the last admin protected) and a filterable audit log (actor Combobox, event MultiSelect, DateRangePicker in the reader’s time zone, expandable rows, CSV export of the current filter); actions disabled with a reason or hidden by capability; the audit tab hidden and its route guarded.',
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
    archetype: 'Assistant beside a page (AI)',
    file: 'src/examples/RecordCopilot.tsx',
    id: 'examples-record-copilot--answered',
    example: 'Record copilot',
    choose: 'People ask questions about the record or page they are on, with it still in view.',
    shows: 'The existing record page with an AssistantPanel in the shell (WithAssistant): answers that cite fields and activity, sources that link into the record, tool activity, Stop, Retry, Edit, Feedback, a refusal and each failure in its own words.',
  },
  {
    archetype: 'Inline AI in a form (AI)',
    file: 'src/examples/CreateWithAi.tsx',
    id: 'examples-create-with-ai--suggestion-ready',
    example: 'Create with AI',
    choose: 'A field the AI can draft (a description, a reply), beside writing it by hand.',
    shows: 'Suggest beside the field, disabled with a reason per role; ghost text (Tab or Accept, Esc or Dismiss); accepted text marked “Drafted with AI” until edited; one Undo back to what was there.',
  },
  {
    archetype: 'AI-proposed changes (AI)',
    file: 'src/examples/AiReviewChanges.tsx',
    id: 'examples-ai-bulk-changes--proposed',
    example: 'AI bulk changes',
    choose: 'An agent would change data: many records, or any write at all.',
    shows: 'The agent’s steps, a proposal limited to what the person could do, ReviewChanges (accept or reject each, apply), apply and undo through the named mutation, partial failure, a refusal for a viewer.',
  },
  {
    archetype: 'Chat page (AI)',
    file: 'src/examples/AssistantChatPage.tsx',
    id: 'examples-assistant-chat--with-history',
    example: 'Assistant chat',
    choose: 'Open-ended, multi-turn questions that span the workspace.',
    shows: 'History in PageLayout’s nav with the open conversation in the URL, new chat, rename and delete, the composer in the sticky footer, and streaming, stopped, refused, rate-limited and failed answers.',
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
            <>
              AI surfaces follow the same rules and add their own (citations, review before any write, undo, the assistant acting only as
              the person): see the AI patterns guide.
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
