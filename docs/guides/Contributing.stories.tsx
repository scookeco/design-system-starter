import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const CHANGES = [
  { change: 'A new component, primitive, variant, token or export', kind: 'Additive', today: 'Merge when the checklist is green.', later: 'Minor release' },
  { change: 'A bug fix or a visual correction with the same API', kind: 'Fix', today: 'Merge; say which screenshots changed and why.', later: 'Patch release' },
  { change: 'Renaming or removing an export, a prop, a variant value or a semantic token', kind: 'Breaking', today: 'Deprecate first (below); remove in a later pull request.', later: 'Major release, with a migration note and, for many call sites, a codemod' },
  { change: 'Changing what a token means (not just its value)', kind: 'Breaking', today: 'Add a new token and deprecate the old one; never repurpose a name.', later: 'Major release' },
] as const;

function Contributing() {
  return (
    <DocPage
      title="Contributing and versioning"
      lead="Anything new starts as a proposal on the decision ladder, lands in one pull request with its stories, docs and tests, and leaves the old way through a deprecation, never a silent removal."
    >
      <DocSection title="1. Propose">
        <Rules
          items={[
            <>
              Walk the <StoryLink id="guides-decision-ladder--decision-ladder-guide">decision ladder</StoryLink> and stop at the first yes:
              template, variant, component, primitive. Most needs stop at a template or a variant.
            </>,
            <>
              Write a short proposal in the issue or the pull request: the use cases (at least two real ones), the props, an owner, and which
              existing screens would move to it.
            </>,
            <>A second use is the signal to review a local block for promotion; three distinct uses usually confirm the abstraction.</>,
            <>A repeated escape hatch is a proposal waiting to be written: two screens with the same UNSAFE_ override are asking for a variant.</>,
          ]}
        />
      </DocSection>
      <DocSection title="2. What a pull request must include">
        <Rules
          items={[
            <>A story for every variant, size and state (open overlays tagged as the Testing guide says), so the visual and axe suites cover it.</>,
            <>
              A usage doc in <code>docs/usage/&lt;Name&gt;.usage.tsx</code> for every new export: when to use, when not (and what instead), a do,
              a don’t, and accessibility. The docs test fails without it.
            </>,
            <>
              Tokens and system CSS regenerated with <code>npm run tokens</code>, and the token usage map committed.
            </>,
            <>
              <code>npm run check</code> green: tokens, types, lint, unit tests, lint-rule fixtures, build, bundle budgets and tree-shaking.
            </>,
            <>A new lint rule comes with a violation fixture registered in the rule test.</>,
            <>A raised bundle budget goes in its own commit, with the old and new limits and what grew.</>,
            <>The README and the agent rules updated when the parts list or a rule changes.</>,
            <>In the description: which existing stories render differently on purpose, so their baselines are regenerated and reviewed.</>,
          ]}
        />
      </DocSection>
      <DocSection title="3. Deprecate before removing">
        <Rules
          items={[
            <>Keep the old name working as an alias of the new one, and mark it in its type so editors strike it through.</>,
            <>Say what replaces it, and when it goes, in the pull request and the changelog.</>,
            <>Remove it in a later pull request, after every call site has moved. Grep for it; the build fails on any that remain.</>,
          ]}
        />
        <Code label="Deprecated alias">{`
/** @deprecated Use Divider. Removed after every screen has moved. */
export const Separator = Divider;
`}</Code>
        <Text>
          A semantic token deprecates the same way: keep the old token as an alias of the new one for the deprecation window.
        </Text>
      </DocSection>
      <DocSection title="4. Versioning" intro="Today the system is one folder in one repository, released with the app. Semantic versioning starts when a second app consumes it; the table says how each change will be released then.">
        <Table caption="Kinds of change">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Change</TableHeaderCell>
              <TableHeaderCell>Kind</TableHeaderCell>
              <TableHeaderCell>Today</TableHeaderCell>
              <TableHeaderCell>Once published</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {CHANGES.map((c) => (
              <TableRow key={c.change}>
                <TableCell rowHeader>{c.change}</TableCell>
                <TableCell>{c.kind}</TableCell>
                <TableCell>{c.today}</TableCell>
                <TableCell>{c.later}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack gap="xs">
          <Text>
            Package publishing, a changelog tool and codemods are listed in the README under “Deliberately not included yet”, each with the moment
            to add it. Until then the pull request history is the changelog.
          </Text>
        </Stack>
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Contributing and versioning', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const ContributingGuide: StoryObj = { name: 'Contributing and versioning', render: () => <Contributing /> };
