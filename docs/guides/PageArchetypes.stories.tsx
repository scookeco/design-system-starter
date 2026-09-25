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
    shows: 'PageHeader with one primary action, SearchField and a Filters popover with removable chips, a sortable table, Pagination; loading, first use, no results and load error states.',
  },
  {
    archetype: 'Record / detail',
    file: 'src/examples/RecordPage.tsx',
    id: 'examples-record-page--default',
    example: 'Record page',
    choose: 'One record is the subject: its status, properties, activity and the actions on it.',
    shows: 'Breadcrumb, PageHeader with status and a “More” menu, NavTabs for Overview · Activity · Files, a properties aside in PageLayout.',
  },
  {
    archetype: 'Create and edit',
    file: 'src/examples/CreateEditFlow.tsx',
    id: 'examples-create-and-edit--empty',
    example: 'Create and edit',
    choose: 'Someone fills in a record: a full page for heavy records, a quick-create dialog for light ones.',
    shows: 'Errors on blur and submit, a focused error summary linking to fields, a pending submit in the sticky action bar.',
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
    shows: 'EmptyState as the h1, plain words, Try again and a way home.',
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
            <>Map domain statuses to badge tones in one place, as the examples’ status-to-tone map does.</>,
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
