import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';
import { inline } from '../ui/inline';

/** Where the Baseline statuses below come from, and when they were read. Re-read them when a row changes. */
const SOURCE = 'web-features 3.40.0, read on 2026-09-29';

const ADOPTED = [
  {
    feature: '`:has()`',
    where: 'PageLayout (which regions are present), Tag (a remove button), AppShell (an assistant column); sticky footers’ scroll padding; invalid and disabled fields; room for a toast in AppShell’s main',
    replaces: 'Data attributes set from props only to describe the markup (`data-nav`, `data-aside`, `data-removable`, `data-assistant`): the CSS reads the markup itself, so the two can’t disagree.',
    baseline: 'Widely available (2026-06-19)',
    without: 'Required: no fallback.',
  },
  {
    feature: '`@starting-style` with transitions',
    where: 'Entry of Popover, Tooltip, HoverCard, Menu, ContextMenu, Select, the pickers (Combobox, MultiSelect, DatePicker), Dialog, Drawer, CommandPalette and Toast',
    replaces: 'Nothing: overlays appeared at once. They now fade (a toast rises, a drawer slides from its edge) over motion tokens, with no JavaScript and no change to Radix or React Aria.',
    baseline: 'Newly available (2024-08-06)',
    without: 'The rule is ignored and the overlay appears at once, as before. Reduced motion makes the duration 0ms.',
  },
  {
    feature: 'Same-document view transitions',
    where: 'The example app: route changes and a list’s display switch (table ↔ board), through `withViewTransition` in `src/app/viewTransition.ts`',
    replaces: 'Nothing: the page swapped at once. Now it cross-fades over `motion.view`.',
    baseline: 'Newly available (2025-10-14)',
    without: 'The helper checks for `document.startViewTransition` and runs the update directly. It also skips under reduced motion and when `html[data-view-transitions="off"]` (the test harness sets it).',
  },
  {
    feature: '`text-wrap: balance`',
    where: 'Headings, h1 to h4 (reset layer)',
    replaces: 'Ragged two-line headings with one word on the second line.',
    baseline: 'Newly available (2024-05-13)',
    without: 'Ignored: headings wrap normally.',
  },
  {
    feature: '`text-wrap: pretty`',
    where: 'Body copy: p, li, dd, blockquote, figcaption (reset layer)',
    replaces: 'A single word left alone on a paragraph’s or a list item’s last line.',
    baseline: 'Limited: Chrome, Edge and Safari; not Firefox',
    without: 'Ignored: text wraps normally.',
  },
  {
    feature: '`scrollbar-gutter: stable`',
    where: 'AppShell’s main, SplitView’s panes, CommandPalette’s results, ChatThread',
    replaces: 'Content shifting sideways when a classic (non-overlay) scrollbar appears: a list loading, results filtering, an answer streaming in.',
    baseline: 'Newly available (2024-12-11)',
    without: 'Ignored: the shift comes back on platforms with classic scrollbars. Overlay scrollbars (macOS, phones, headless test browsers) never had it.',
  },
  {
    feature: '`field-sizing: content`',
    where: 'Composer and Suggestion: text boxes that grow with what’s typed',
    replaces: 'Measuring scrollHeight in script to grow a text box.',
    baseline: 'Newly available (2026-06-16)',
    without: 'Ignored: the Composer keeps its minimum height and scrolls; the Suggestion box keeps its rows and its ghost text still lines up (checked with the property turned off).',
  },
  {
    feature: '`box-decoration-break: clone`',
    where: 'DocumentViewer: a highlight or a data-field placeholder that wraps onto a second line',
    replaces: 'Nothing: the background would break square at the line end.',
    baseline: 'Limited: Chrome, Edge and Firefox; Safari only as -webkit-box-decoration-break',
    without: 'Ignored: a wrapped highlight keeps its rounded outer ends, and its inner ends are square. Nothing moves.',
  },
  {
    feature: '`light-dark()`',
    where: 'Every semantic colour in the token output',
    replaces: 'A second block of colour variables per scheme.',
    baseline: 'Newly available (2024-05-13); widely available on 2026-11-13',
    without: 'The one required feature that isn’t widely available yet: without it no colour resolves. Adopted with dark mode; if a supported browser lacked it, the token build would write one block per scheme instead.',
  },
  {
    feature: 'Cascade layers, container queries, logical properties, `:focus-visible`, `color-scheme`, individual transforms (`translate`), `:dir()`',
    where: 'Everywhere: layer order, responsive layouts, RTL, the focus ring, dark mode, the drawer’s slide',
    replaces: 'n/a',
    baseline: 'Widely available',
    without: 'Required: no fallback.',
  },
] as const;

const NOT_ADOPTED = [
  {
    feature: 'CSS anchor positioning (`anchor-name`, `position-anchor`, `position-area`, `position-try-fallbacks`)',
    why: 'Not Baseline as a feature; `position-anchor` only reached newly available on 2026-09-14, so it is widely available in 2029. Radix and React Aria position every overlay today, and their positioning can’t be handed to CSS (see the overlay table).',
  },
  {
    feature: 'The `popover` attribute (top layer, light dismiss)',
    why: 'Newly available (2025-01-27; widely available in 2027-07). The overlays are already portalled and stacked by the z tokens, and a native popover isn’t one of Radix’s dismissable layers (see the overlay table).',
  },
  {
    feature: '`popover="hint"` and interest invokers (`interestfor`)',
    why: 'Not Baseline: popover="hint" isn’t in Safari, and interest invokers are only in Chrome and Edge. They are the native Tooltip and HoverCard; revisit when they are widely available.',
  },
  {
    feature: '`interpolate-size`, `calc-size()` and `transition-behavior: allow-discrete` for Disclosure and Accordion',
    why: 'interpolate-size and calc-size are Chrome and Edge only. And animating height is what the Motion guide rules out: it moves the page and costs a layout on every frame. Disclosure and Accordion open at once and turn their chevron; there is no script to remove.',
  },
  {
    feature: '`field-sizing: content` on Textarea',
    why: 'Textarea doesn’t grow with its content, and has no script doing it: it has rows and a vertical resize handle, by design. Auto-grow is the Composer’s.',
  },
  {
    feature: '`color-mix()` in component CSS',
    why: 'Colour functions are banned outside the token source (lint), and every colour is a named token whose contrast is tested in light and dark from resolved values. A colour mixed at runtime is one the contrast test can’t see.',
  },
  {
    feature: 'Cross-document view transitions, scroll-driven animations',
    why: 'Not Baseline, and nothing needs them: the app is one document, and nothing moves with scrolling.',
  },
] as const;

const OVERLAYS = [
  {
    component: 'Tooltip',
    from: 'Radix Tooltip',
    native: 'Keep Radix',
    why: 'Open on hover and focus with a delay, a pointer grace area, Escape, aria-describedby. The native version (popover="hint" with interest invokers) isn’t Baseline.',
  },
  {
    component: 'HoverCard',
    from: 'Radix HoverCard',
    native: 'Keep Radix',
    why: 'Open and close delays and a grace area between link and card; the native version is interest invokers, not Baseline.',
  },
  {
    component: 'Popover',
    from: 'Radix Popover',
    native: 'Keep Radix',
    why: 'A non-modal dialog: focus moves in and returns to the trigger, Escape and an outside click close it. popover="auto" would add light dismiss and the top layer, but not focus management, and its Escape isn’t coordinated with a Dialog underneath.',
  },
  {
    component: 'Menu',
    from: 'Radix DropdownMenu',
    native: 'Keep Radix',
    why: 'Roving focus, typeahead, submenus, modal focus while open. None of that is in the platform.',
  },
  {
    component: 'ContextMenu',
    from: 'Radix ContextMenu',
    native: 'Keep Radix',
    why: 'Opens at the pointer, not at an element, so there is no anchor for CSS anchor positioning to name.',
  },
  {
    component: 'Select',
    from: 'Radix Select',
    native: 'Keep Radix',
    why: 'Item-aligned positioning, typeahead, scroll buttons. The native equivalent (a customisable select) isn’t Baseline.',
  },
  {
    component: 'Combobox, MultiSelect, DatePicker',
    from: 'React Aria',
    native: 'Keep React Aria',
    why: 'Combobox and grid keyboard models, virtual focus, announcements and collision handling, all measured in script.',
  },
  {
    component: 'Dialog, Drawer, CommandPalette',
    from: 'Radix Dialog',
    native: 'Keep Radix',
    why: 'Modal: focus trap, the page behind hidden from assistive technology and unclickable, scroll lock, focus return. The dialog element’s showModal() is widely available and does much of this, but moving means re-proving every one of those behaviours for no bug fixed today. A candidate once there is one.',
  },
  {
    component: 'Toast',
    from: 'Radix Toast',
    native: 'Keep Radix',
    why: 'A labelled region with a hotkey, pause on hover and focus, swipe to dismiss, and announcements by tone. The top layer would put toasts above modals, which z.toast already does.',
  },
] as const;

function BrowserSupport() {
  return (
    <DocPage
      title="Browser support and the platform"
      lead="The system targets evergreen browsers and uses the platform where it makes things simpler, sturdier or more accessible. Anything a page needs to work is Baseline widely available; anything newer is an enhancement the page works without."
    >
      <DocSection title="The rule">
        <Rules
          items={[
            <>
              <strong>Required: Baseline widely available.</strong> A feature a page can’t work without has been in every core browser (Chrome,
              Edge, Firefox, Safari, on desktop and mobile) for 30 months.
            </>,
            <>
              <strong>Enhancement: newly available, or newer, only with a working fallback.</strong> Either the browser drops the declaration
              and what’s left still works (the fallback is checked, not assumed), or it sits behind <code>@supports</code> or a feature check in
              script, with today’s behaviour as the other branch.
            </>,
            <>
              <strong>Behaviour stays where it is proven.</strong> Keyboard, focus, dismissal and what’s announced come from Radix, React Aria or
              our own tested code until a native version is widely available and does everything they do. An enhancement may change how
              something looks or moves, never how it behaves.
            </>,
            <>
              <strong>Motion enhancements honour reduced motion and never reach a screenshot.</strong> Durations come from motion tokens (0ms
              under reduced motion), and the visual suite captures only settled end states. See{' '}
              <StoryLink id="guides-motion--motion-guide">Motion</StoryLink>.
            </>,
            <>
              <strong>Every adoption is a row below</strong>, with its status and what happens without it. One exception is on record:{' '}
              <code>light-dark()</code>, required by the token output, becomes widely available on 2026-11-13.
            </>,
          ]}
        />
        <Text tone="muted">Statuses from {SOURCE}. Check a feature on webstatus.dev (or in the web-features package) before you use it.</Text>
      </DocSection>
      <DocSection title="What the system uses">
        <Table caption="Platform features in use">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Feature</TableHeaderCell>
              <TableHeaderCell>Where</TableHeaderCell>
              <TableHeaderCell>What it replaces or fixes</TableHeaderCell>
              <TableHeaderCell>Baseline</TableHeaderCell>
              <TableHeaderCell>Without it</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ADOPTED.map((row) => (
              <TableRow key={row.feature}>
                <TableCell rowHeader>{inline(row.feature)}</TableCell>
                <TableCell>{inline(row.where)}</TableCell>
                <TableCell>{inline(row.replaces)}</TableCell>
                <TableCell>{row.baseline}</TableCell>
                <TableCell>{inline(row.without)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection
        title="Overlays: native popover and anchor positioning"
        intro="Decided per component. Every overlay keeps its behaviour library, which also positions it; what changed is that each one fades in (@starting-style above)."
      >
        <Rules
          items={[
            <>
              <strong>Positioning can’t be handed to CSS while Radix renders the overlay.</strong> Radix places the content in a wrapper whose
              position and transform it writes as inline styles on every update. Anchor positioning would have to override them, which needs{' '}
              <code>!important</code> (banned); adopting it means dropping Radix for that component.
            </>,
            <>
              <strong>A native popover would break Escape inside a Dialog.</strong> Radix closes only the topmost of its own layers on Escape,
              from a keydown listener on the document. A native popover isn’t one of those layers, so Escape in a popover inside a Dialog would
              close both.
            </>,
            <>
              <strong>The top layer fixes nothing here yet.</strong> Overlays portal to the body and stack by the z tokens (Foundations/Layers), so
              none is clipped or covered today.
            </>,
            <>
              <strong>Revisit</strong> when the popover attribute is widely available (2027-07) for a stacking bug the z tiers can’t fix, and
              when anchor positioning and interest invokers are widely available, for Tooltip and HoverCard first.
            </>,
          ]}
        />
        <Table caption="Overlay decisions">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Component</TableHeaderCell>
              <TableHeaderCell>Behaviour from</TableHeaderCell>
              <TableHeaderCell>Popover and anchoring</TableHeaderCell>
              <TableHeaderCell>Why</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {OVERLAYS.map((row) => (
              <TableRow key={row.component}>
                <TableCell rowHeader>{row.component}</TableCell>
                <TableCell>{row.from}</TableCell>
                <TableCell>{row.native}</TableCell>
                <TableCell>{row.why}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Considered and not adopted">
        <Table caption="Features not adopted">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Feature</TableHeaderCell>
              <TableHeaderCell>Why not</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {NOT_ADOPTED.map((row) => (
              <TableRow key={row.feature}>
                <TableCell rowHeader>{inline(row.feature)}</TableCell>
                <TableCell>{inline(row.why)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>
      <DocSection title="Adopting a feature">
        <Rules
          items={[
            <>Name the problem it fixes, in a story or a test. “It’s new” isn’t one.</>,
            <>Look up its Baseline status and date, and decide: required (widely available only) or an enhancement (with a fallback).</>,
            <>Check the fallback: turn the feature off in the browser, or run the branch without it, and look.</>,
            <>
              Values still come from tokens, and the CSS rules still hold: logical properties, <code>@layer</code>, specificity no higher than
              0,3,0. If Stylelint rejects a valid new property or value, change its config with a violation fixture for any new rule.
            </>,
            <>Add the row to this page, and say in the pull request which screenshots it changed.</>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = {
  title: 'Guides/Browser support and the platform',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen', summary: 'The Baseline rule, platform features in use, overlays and native popover' },
} satisfies Meta;
export default meta;
export const BrowserSupportGuide: StoryObj = { name: 'Browser support and the platform', render: () => <BrowserSupport /> };
