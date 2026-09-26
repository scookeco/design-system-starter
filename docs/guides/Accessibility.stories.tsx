import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../src/index';
import { StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const SPLIT = [
  {
    area: 'Names and labels',
    system: 'Every control requires its label or accessible name as a prop. Fields wire label, hint and error to the input.',
    product: 'Write labels that make sense out of context. Name icon-only buttons (aria-label plus a Tooltip).',
  },
  {
    area: 'Headings and landmarks',
    system: 'AppShell, AuthLayout and FocusedLayout provide the banner and main landmarks (AppShell also navigation and a skip link). PageHeader renders the page’s one h1; PageLayout names its aside. Heading takes a required level.',
    product: 'One h1 per page, then levels in order. Pick the level for the outline; use size for the look.',
  },
  {
    area: 'Focus',
    system: 'Visible focus ring on everything. Dialogs, Drawers and menus trap and restore focus; Popovers restore it. Pending buttons and aria-disabled pagination ends keep focus. Scroll containers with sticky bars or headers reserve scroll padding, so focus never lands behind them.',
    product: 'After navigation or a wizard step, move focus to the new h1 (PageHeader’s headingRef) or main. After submit with errors, focus the error summary or the first invalid field. After removing a chip, focus the next one.',
  },
  {
    area: 'Colour and contrast',
    system: 'Semantic pairs pass WCAG 2.2 AA in light and dark (tested). Status never relies on colour alone: badges carry text and an icon.',
    product: 'Use the semantic roles as paired. Don’t put text on a colour the pair list doesn’t cover.',
  },
  {
    area: 'Announcements',
    system: 'Toasts and Banners announce by tone: danger and warning assertively, info and success politely. Field errors are announced with the field.',
    product: 'Announce the outcome of async work (saved, failed) with a Toast or Banner, not only a visual change.',
  },
  {
    area: 'Motion and targets',
    system: 'Durations collapse under reduced motion. Every target is at least 24px or spaced so a 24px circle around it touches nothing else (checked on every story). Nothing is draggable yet; a lint rule makes any drag declare its single-pointer alternative.',
    product: 'Don’t add motion that carries meaning. Keep custom hit areas at least the target-min size. Give every drag a button or menu alternative and name it in data-drag-alternative.',
  },
  {
    area: 'Sign-in',
    system: 'Password fields have a show-password toggle. Nothing blocks paste.',
    product: 'Set autoComplete: username, current-password or new-password, one-time-code. No CAPTCHA or other memory or puzzle test without an alternative.',
  },
  {
    area: 'Help and repeated input',
    system: 'AppShell’s help slot sits in the same place on every page.',
    product: 'Pass help once, from the app’s shell composition. In a multi-step flow, never ask again for what was already given: show it, prefill it, or let people pick it.',
  },
] as const;

function Accessibility() {
  return (
    <DocPage
      title="Accessibility"
      lead="The target is WCAG 2.2 AA. The system guarantees what can be decided once; product code owns what depends on the page. Both halves are needed."
    >
      <DocSection title="Who owns what">
        <Table caption="System guarantees and product responsibilities">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Area</TableHeaderCell>
              <TableHeaderCell>The system guarantees</TableHeaderCell>
              <TableHeaderCell>Product code owns</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SPLIT.map((row) => (
              <TableRow key={row.area}>
                <TableCell rowHeader>{row.area}</TableCell>
                <TableCell>{row.system}</TableCell>
                <TableCell>{row.product}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="How it’s checked">
        <Rules
          items={[
            <>Contrast of every semantic pair, light and dark: a unit test on the token source.</>,
            <>axe (WCAG 2.2 A and AA) on every story in both themes, and on every Docs tab: the visual suite.</>,
            <>WCAG 2.2 checks axe doesn’t make, on every story: target size, focus not obscured, accessible authentication, consistent help. Plus a lint rule for dragging and unit audits for sign-in and redundant entry.</>,
            <>Component behaviour (names, states, keyboard): component tests.</>,
            <>Automated checks find about a third of issues. Before shipping a new flow, use it with the keyboard only and with a screen reader.</>,
            <>
              What each check covers, what needs a person and how to run them: <StoryLink id="guides-accessibility-conformance--accessibility-conformance-guide">Accessibility conformance</StoryLink>.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Accessibility', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const AccessibilityGuide: StoryObj = { name: 'Accessibility', render: () => <Accessibility /> };
