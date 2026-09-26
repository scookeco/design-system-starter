import { Button, CommandPalette, Kbd } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [CommandPalette],
  whenToUse: [
    'Once per app, in the shell composition, opened with ⌘K / Ctrl+K (`useShortcut` with `allowInInputs`) and from a Search button in the header that shows the keys.',
    'Jumping to any page or record and running actions by typing: pages from the route table, records from a server search (`filter: "none"`), actions that mirror buttons.',
  ],
  whenNotToUse: [
    { situation: 'Searching one list', instead: '`SearchField` on the list page (its results stay in the page and the URL)' },
    { situation: 'Choosing a value for a form field', instead: '`Combobox`' },
    { situation: 'The only way to reach something', instead: 'visible navigation and buttons first; the palette is the fast path' },
  ],
  do: {
    caption: 'Grouped rows with a type in the description and a shortcut where one exists; only what this person may do is passed in.',
    render: () => (
      <Button variant="secondary" icon="search">
        <span>Search</span> <Kbd keys="mod+k" />
      </Button>
    ),
  },
  dont: {
    caption: 'A search button with no sign of the shortcut: pointer users never learn ⌘K exists. (And never pass rows the person can’t run: filter with `can` first.)',
    render: () => <Button variant="secondary" icon="search">Search</Button>,
  },
  accessibility: [
    'A modal dialog (focus trapped, the page inert, Esc closes, focus returns) holding the ARIA combobox pattern: the input keeps focus and `aria-activedescendant` names the active option.',
    'The number of results is announced (`role="status"`) as the query changes; `countMessage` words it.',
    '↑ ↓ wrap around the list, ↵ runs the active row, and pointer users can click any row. Shortcuts on rows are also `aria-keyshortcuts`.',
    'Keep labels verb-first for actions and give records a type in `description`, so a result is clear without seeing its group.',
  ],
};
