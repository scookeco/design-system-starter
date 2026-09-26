import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../src/index';
import { Code, StoryLink } from '../ui/Code';
import { DocPage, DocSection, Rules } from '../ui/DocPage';

const KEYS = [
  { keys: 'mod+k', what: 'Open or close the command palette', where: 'Everywhere, even in a text field (allowInInputs)' },
  { keys: '?', what: 'Show every shortcut active on this page', where: 'Everywhere outside a text field' },
  { keys: 'g h', what: 'Go to Home (g r Records, g a Accounts, g p People, g i Inbox, g m Members, g s Settings)', where: 'Everywhere; only pages this role may open' },
  { keys: 'j', what: 'Next item (k: previous)', where: 'Lists worked one item at a time: the inbox' },
  { keys: 'e', what: 'Archive the open item, or the selection', where: 'The inbox' },
  { keys: 'u', what: 'Mark read or unread', where: 'The inbox' },
  { keys: 'x', what: 'Select the open item for bulk triage', where: 'The inbox' },
] as const;

const CONVENTIONS = [
  { kind: '⌘ / Ctrl chords (mod+k)', use: 'App-wide commands people use from anywhere, including while typing.', rule: 'Never a chord the browser owns (copy, paste, find, new tab, zoom…): the registry refuses them.' },
  { kind: 'Sequences (g then i)', use: 'Jumps: two letters, the first a verb ("go"). Many jumps, one prefix.', rule: 'A single key that starts a sequence conflicts with it (g alone would always fire first).' },
  { kind: 'Single keys (j, k, e, ?)', use: 'Repeated actions in a queue, where speed matters most.', rule: 'Can be turned off in the ? overlay (WCAG 2.2 SC 2.1.4); never fire in a text field or a dialog.' },
  { kind: 'Keys inside a widget (arrows, Enter, Space, Escape)', use: 'The widget’s own model: a listbox, a menu, a grid, a toolbar.', rule: 'Not for the registry: they are reserved, so page shortcuts can’t steal them.' },
] as const;

function KeyboardPowerUsers() {
  return (
    <DocPage
      title="Keyboard and power users"
      lead="People who use a product all day stop reaching for the mouse. The system gives them a command palette, one registry for every shortcut, and pickers built for the keyboard, without taking anything away from people who find their way by looking."
    >
      <DocSection title="The test">
        <Rules
          items={[
            <>An expert can run the core loop without the mouse; a newcomer can still find everything by looking. A shortcut is an accelerator for a visible control, never the only way.</>,
            <>
              Every shortcut shows where people will learn it: in the control’s tooltip (<code>Tooltip shortcut</code>), its menu item (
              <code>MenuItem.shortcut</code>), its command palette row, and the <Kbd keys="?" /> overlay. The same notation everywhere:{' '}
              <code>mod+k</code> is <Kbd keys="mod+k" platform="mac" /> on a Mac and <Kbd keys="mod+k" platform="other" /> elsewhere.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="The command palette" intro="⌘K / Ctrl+K from anywhere, or the Search button in the header that shows the keys.">
        <Rules
          items={[
            <>
              <code>CommandPalette</code> is UI only: a modal dialog with the ARIA combobox pattern (the input keeps focus, ↑ ↓ move, ↵ runs, Esc
              closes and focus returns), grouped results, forgiving ranking, and the result count announced. The app decides what’s in it.
            </>,
            <>
              The app’s composition (<code>src/examples/CommandMenu.tsx</code>) fills it from what already exists, so nobody maintains a list:
              pages from the route table (every page without params, named by its <code>title</code>), records from the list’s own server search,
              accounts and people from their directories, actions that mirror buttons, and recent items.
            </>,
            <>
              <strong>Only what this person may do.</strong> Every page row asks <code>can(route.guard)</code>, the route guard’s own check;
              every action asks the capability its button asks; records come from the server’s query, so a viewer never finds a draft. A command
              then does exactly what its button does (the same route, the same session function), so it can’t get past a guard or a
              mutation’s own refusal. See the <StoryLink id="examples-command-palette--create-actions">admin</StoryLink> and{' '}
              <StoryLink id="examples-command-palette--create-actions-as-viewer">viewer</StoryLink> palettes for the same query.
            </>,
            <>
              Recent items are kept in the cache partition (<code>src/app/model/recent.ts</code>), as ids: they follow the workspace switch, drop
              with a permission change, clear on sign-out, and show current names.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="The shortcut registry" intro="One document listener, one list of every active shortcut, one set of rules.">
        <Code label="Registering a shortcut">{`
useShortcut({
  id: 'inbox.archive',             // stable: conflict reports name it
  keys: 'e',                       // mod+k · shift+? · g i (a sequence) · e
  description: 'Archive',          // verb first: shown in the ? overlay
  scope: 'Inbox',                  // its group in the overlay (default Global)
  handler: archive,                // may change every render
  enabled: targets.length > 0,     // registered, but only fires when it makes sense
});
`}</Code>
        <Rules
          items={[
            <>A shortcut lives as long as the component that registers it: page shortcuts come and go with the page, and the overlay lists what’s active now.</>,
            <>
              <strong>Conflicts.</strong> Two active shortcuts with the same keys on this platform (<code>mod+k</code> and <code>ctrl+k</code>{' '}
              collide on Windows, not on a Mac), or a single key that starts a sequence: the first registration keeps the keys, the second never
              fires, and the conflict is reported (<code>console.error</code>, naming both ids). <code>findShortcutConflicts</code> is the same
              check as a pure function, for a test over a whole app’s shortcuts.
            </>,
            <>
              <strong>Reserved keys are refused</strong> and never prevented: copy, paste, cut, undo, select all, find, address bar, tabs,
              windows, reload, print, zoom, history (Alt+←/→), Tab, Enter, Space, Escape, arrows, Home/End, Page Up/Down, F-keys, and any
              Control+Option (VoiceOver) or Control+Alt chord (screen readers). <code>isReservedShortcut</code> answers for any keys.
            </>,
            <>
              <strong>Nothing fires</strong> while typing in a field (unless <code>allowInInputs</code>, for ⌘ chords only), from inside a dialog
              (unless <code>allowInDialogs</code>), during IME composition, or after another handler took the key.
            </>,
          ]}
        />
        <Table caption="Kinds of shortcut">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Kind</TableHeaderCell>
              <TableHeaderCell>Use it for</TableHeaderCell>
              <TableHeaderCell>Rule</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {CONVENTIONS.map((c) => (
              <TableRow key={c.kind}>
                <TableCell rowHeader>{c.kind}</TableCell>
                <TableCell>{c.use}</TableCell>
                <TableCell>{c.rule}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DocSection>

      <DocSection title="The app’s shortcuts">
        <Table caption="Shortcuts in the example app">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Keys</TableHeaderCell>
              <TableHeaderCell>Does</TableHeaderCell>
              <TableHeaderCell>Where</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {KEYS.map((k) => (
              <TableRow key={k.keys}>
                <TableCell rowHeader>
                  <Kbd keys={k.keys} />
                </TableCell>
                <TableCell>{k.what}</TableCell>
                <TableCell>{k.where}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Rules
          items={[
            <>
              The <StoryLink id="examples-inbox--conversation-open">inbox</StoryLink> is the reference: j/k move and focus follows, e archives and
              opens the next, and each key mirrors a toolbar button, a row’s context menu and the bulk toolbar. See{' '}
              <StoryLink id="examples-inbox--shortcuts-overlay">its ? overlay</StoryLink>.
            </>,
          ]}
        />
      </DocSection>

      <DocSection title="Keyboard-first components">
        <Rules
          items={[
            <>
              <code>Combobox</code> and <code>MultiSelect</code> (type to narrow, ↑ ↓ ↵), <code>DatePicker</code> and <code>DateRangePicker</code>{' '}
              (type each segment or use ↑ ↓; the calendar is a grid), <code>NumberField</code> (↑ ↓ step, Page Up/Down by ten): React Aria
              behind the system’s closed API. Dates and numbers follow <code>LocaleProvider</code>, the same locale and time zone as{' '}
              <code>useFormat()</code>; values stay ISO dates and integer minor units.
            </>,
            <>Inside a Dialog their popovers portal into the dialog, and Esc closes only the popover.</>,
            <>
              <code>Toolbar</code> is one tab stop with arrow keys between its buttons; <code>ContextMenu</code> opens with Shift+F10 on the
              focused row and repeats actions that are visible elsewhere; <code>InlineEdit</code> edits one value in place with Enter and Esc;{' '}
              <code>SplitView</code>’s divider resizes with the arrow keys.
            </>,
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

const meta = { title: 'Guides/Keyboard and power users', tags: ['!autodocs'], parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
export const KeyboardAndPowerUsersGuide: StoryObj = { name: 'Keyboard and power users', render: () => <KeyboardPowerUsers /> };
