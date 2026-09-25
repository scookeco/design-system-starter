import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { inline } from '../ui/inline';

const AUTOMATED = [
  {
    criterion: '1.4.3, 1.4.11 Contrast',
    how: 'Every semantic text/background and UI pair, light and dark, computed from the token source.',
    where: '`npm test` (`tests/unit/contrast.test.ts`)',
  },
  {
    criterion: 'WCAG 2.2 A and AA rules axe can decide',
    how: 'axe on every story in both themes and on every Docs tab. Includes axe’s own target-size rule.',
    where: '`npm run test:visual` (`tests/visual/stories.spec.ts`)',
  },
  {
    criterion: '2.5.8 Target Size (Minimum), AA',
    how: 'Every pointer target, not only the focusable widgets axe measures, is 24×24 CSS px or passes the spacing exception (24px circles), with the inline-text exception. Reports story and selector.',
    where: '`npm run test:wcag22`',
  },
  {
    criterion: '2.4.11 Focus Not Obscured (Minimum), AA',
    how: 'Tabs through every story forward, then backward, and fails when the focused element is entirely covered (by a sticky action bar or table header) or off screen.',
    where: '`npm run test:wcag22`',
  },
  {
    criterion: '2.5.7 Dragging Movements, AA',
    how: 'Lint: an element with `draggable`, an `onDrag…`/`onDrop` handler or a pointer down+move pair must declare `data-drag-alternative`; a file importing a drag-and-drop library must declare one.',
    where: '`npm run lint` (rule `starter/drag-needs-alternative`)',
  },
  {
    criterion: '3.3.8 Accessible Authentication (Minimum), AA',
    how: 'Every story: password fields have `autocomplete` current-password or new-password and a show-password button; no field blocks paste; no CAPTCHA. The sign-in example: `username`, `current-password`, `one-time-code`.',
    where: '`npm run test:wcag22` and `npm test` (`tests/unit/wcag22.test.tsx`)',
  },
  {
    criterion: '3.2.6 Consistent Help, A',
    how: 'Every example page that renders AppShell has its help slot, in the header right before the account menu.',
    where: '`npm run test:wcag22`',
  },
  {
    criterion: '3.3.7 Redundant Entry, A',
    how: 'The setup wizard asks each question once, shows every answer on review, and brings answers back on Edit and Back.',
    where: '`npm test` (`tests/unit/wcag22.test.tsx`)',
  },
] as const;

function AccessibilityConformance() {
  return (
    <DocPage
      title="Accessibility conformance"
      lead="What the build checks against WCAG 2.2 AA, what it can’t, and how to run it. A green build is necessary for a conformance claim, never sufficient."
    >
      <DocSection title="What’s automated" intro="Each check fails the build. Each is proved to fire by a deliberate violation, so a green run can’t mean the check stopped running.">
        <Table caption="Automated WCAG checks">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Criterion</TableHeaderCell>
              <TableHeaderCell>What is checked</TableHeaderCell>
              <TableHeaderCell>Where</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {AUTOMATED.map((row) => (
              <TableRow key={row.criterion}>
                <TableCell rowHeader>{row.criterion}</TableCell>
                <TableCell>{inline(row.how)}</TableCell>
                <TableCell>{inline(row.where)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>

      <DocSection title="How the checks prove themselves">
        <Rules
          items={[
            inline('Story checks: each has a fixture story in `tests/visual/fixtures/`, tagged `check-fixture` and `expect:<check>`, that must fail it. Fixtures are hidden from the gallery (`!dev`) and from screenshots and axe (`no-visual`). A test fails when a check has no fixture.'),
            inline('Lint rules: a violation in `fixtures/violations/` and a clean control in `fixtures/clean/`, run by `npm run test:rules`.'),
            inline('Unit audits: each has a negative control, a deliberately bad form or flow the audit must fail.'),
          ]}
        />
      </DocSection>

      <DocSection title="What needs a person" intro="Automated checks find a minority of accessibility problems. Before a release, and before shipping a new flow:">
        <Rules
          items={[
            'Keyboard only: complete every core task with no mouse. Focus order follows reading order, focus is always visible and never lands behind anything, and nothing traps it.',
            'Screen reader: VoiceOver with Safari and NVDA with Firefox or Chrome. Headings, landmarks and names make sense; changes (saved, failed, results updated) are announced.',
            'Zoom and reflow: 200% text zoom, and a 320 CSS px wide viewport with no horizontal scrolling except for tables (SC 1.4.4, 1.4.10). Text-spacing overrides lose nothing (SC 1.4.12).',
            'Focus not obscured beyond the gallery: the check runs at one viewport (1024×768) with gallery content. Try narrow widths, where action bars wrap and grow, and real, longer content.',
            'Target size beyond the gallery: custom hit areas, dense tables and toolbars built in product code, at every breakpoint.',
            inline('Dragging: drags wired with `addEventListener` in an effect are invisible to the lint rule. Check that every drag has a working single-pointer alternative, not just a declared one.'),
            'Authentication across channels: codes sent by email or SMS, recovery flows, and any third-party identity step. No step may require remembering, transcribing or solving something without an alternative.',
            'Consistent help outside AppShell: AuthLayout and FocusedLayout have no help slot yet. If signed-out pages or wizards offer help, keep it in one place across them.',
            'Redundant entry in every multi-step flow, not only the wizard example: nothing already given is asked for again unless it must be re-entered for security or is no longer valid.',
            'Windows High Contrast (forced colours) and prefers-contrast: controls, focus and status stay visible.',
            'Content: link text, error messages and instructions say what to do (see the Content guide).',
          ]}
        />
      </DocSection>

      <DocSection title="How to run the checks">
        <Code label="Commands">{`
npm run check          # contrast, lint (incl. the drag rule), unit audits, test:rules
npm run test:wcag22    # build the gallery, then the WCAG 2.2 story checks and their fixtures
npm run test:visual    # build the gallery, then screenshots, axe and the WCAG 2.2 checks

# Parallel checkouts: serve each gallery on its own port.
PLAYWRIGHT_PORT=6107 npm run test:wcag22
`}</Code>
        <Rules
          items={[
            inline('CI runs every Playwright spec in its visual shards, so the story checks gate a pull request with the screenshots and axe.'),
            inline('The story checks make one light-theme pass per story (none depends on colour). Most of the time goes to tabbing through each story twice.'),
            inline('To add a check: write it in `tests/visual/wcag22-checks.ts`, register it in `tests/visual/wcag22.spec.ts`, and add a fixture story that fails it.'),
          ]}
        />
      </DocSection>

      <DocSection title="Claiming conformance">
        <Rules
          items={[
            'Publish an accessibility statement: the standard and level, what was tested and how, known limitations with dates to fix them, and a way to report a problem.',
            <>
              Start from the <StoryLink id="guides-accessibility-statement--accessibility-statement">Accessibility statement</StoryLink> template.
            </>,
            'Procurement often asks for a VPAT (the ACR format): fill it from the same manual audit, criterion by criterion. Don’t mark a criterion Supports on the strength of an automated check alone.',
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Accessibility conformance', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const AccessibilityConformanceGuide: StoryObj = { name: 'Accessibility conformance', render: () => <AccessibilityConformance /> };
