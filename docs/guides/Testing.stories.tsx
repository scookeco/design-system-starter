import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { inline } from '../ui/inline';

const SUITES = [
  { suite: 'Unit (Vitest)', covers: 'Token source and aliases, contrast in light and dark, CSS structure, the token usage map, component behaviour (names, roles, keyboard, focus), the examples, docs coverage.', run: '`npm test`' },
  { suite: 'Lint rules', covers: 'Every ESLint and Stylelint rule fires on its violation fixture, every import boundary is proved, and the clean controls pass.', run: '`npm run test:rules`' },
  { suite: 'Visual', covers: 'A full-page screenshot of every story in light and dark, against Linux baselines.', run: '`npm run test:visual`' },
  { suite: 'axe', covers: 'WCAG 2.2 A and AA rules on every story in both themes, and on every Docs tab.', run: '`npm run test:visual`' },
  { suite: 'WCAG 2.2 checks', covers: 'Target size, focus not obscured, accessible authentication and consistent help on every story; each check proved by a fixture story that must fail it.', run: '`npm run test:wcag22`' },
  { suite: 'Budgets', covers: 'Library JS and CSS size, one component’s cost, and that one import pulls in only what it composes.', run: '`npm run size` (inside `npm run check`)' },
] as const;

function Testing() {
  return (
    <DocPage
      title="Testing"
      lead="The gallery is the test fixture. Every state gets a story, and every story is screenshotted in both themes, checked by axe and by the WCAG 2.2 checks, so a new state is covered the moment it has a story."
    >
      <DocSection title="The suites">
        <Table caption="Test suites">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Suite</TableHeaderCell>
              <TableHeaderCell>Covers</TableHeaderCell>
              <TableHeaderCell>Run</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SUITES.map((s) => (
              <TableRow key={s.suite}>
                <TableCell rowHeader>{s.suite}</TableCell>
                <TableCell>{s.covers}</TableCell>
                <TableCell>{inline(s.run)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Code label="Before a pull request">{`
npm run check                      # tokens, types, lint, unit, rules, build, budgets
npm run build-storybook
PLAYWRIGHT_PORT=6107 npx playwright test --grep "Components/Slider"   # your stories while iterating
PLAYWRIGHT_PORT=6107 npx playwright test                              # everything, once at the end
`}</Code>
      </DocSection>
      <DocSection title="A story for every state">
        <Rules
          items={[
            <>One story per variant, size and state: empty, filled, error, disabled, loading, open. The suites find new stories on their own.</>,
            <>
              Stories use fixed data: fixed dates, names and numbers, never <code>Date.now()</code> or random values, so screenshots are stable.
            </>,
            <>
              An open modal (Dialog, Drawer, Select, Menu) is tagged <code>['modal-open', '!autodocs']</code>. That relaxes only axe’s{' '}
              <code>aria-hidden-focus</code>, which can’t see the focus trap. An open non-modal overlay (Popover, HoverCard) takes only{' '}
              <code>'!autodocs'</code>.
            </>,
            <>Write the tags as a literal array: Storybook reads them statically, and a spread is ignored.</>,
            <>Behaviour a screenshot can’t show (focus moving, an announcement, a callback) gets a unit test with Testing Library, queried by role and name.</>,
          ]}
        />
      </DocSection>
      <DocSection title="Baselines">
        <Rules
          items={[
            <>
              Linux baselines are committed and are the source of truth. They come only from the Update visual baselines workflow on the CI image;
              never edit or delete them by hand.
            </>,
            <>
              Local baselines (darwin, win32) are gitignored. <code>npm run test:visual:update</code> rewrites yours, so you can diff your own change
              before pushing.
            </>,
            <>
              After an intended visual change: run the workflow on your branch, re-run CI, and review every changed image in the pull request. Say in
              the description which existing stories changed and why.
            </>,
          ]}
        />
      </DocSection>
      <DocSection title="The draft workflow">
        <Rules
          items={[
            <>Open pull requests as drafts while iterating: they run the check job only, which is fast.</>,
            <>Mark it ready for review to build the gallery and run the visual, axe and WCAG 2.2 shards. Merge only once that run is green.</>,
            <>A new push cancels the run it replaces. The gate job, not the shards, is the required check.</>,
          ]}
        />
      </DocSection>
      <DocSection title="WCAG checks and rule tests">
        <Rules
          items={[
            <>
              What each automated check covers and what still needs a person is on{' '}
              <StoryLink id="guides-accessibility-conformance--accessibility-conformance-guide">Accessibility conformance</StoryLink>.
            </>,
            <>
              A new WCAG check comes with a fixture story (tags <code>check-fixture</code>, <code>expect:&lt;check&gt;</code>, <code>!dev</code>,{' '}
              <code>no-visual</code>) that the check must fail.
            </>,
            <>
              A new lint rule comes with a violation fixture in <code>fixtures/violations/</code>, registered in the rule test; <code>npm run test:rules</code>{' '}
              fails if a rule has none or its fixture stops failing.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Testing', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const TestingGuide: StoryObj = { name: 'Testing', render: () => <Testing /> };
