import { ariaKeyShortcuts, Button, Cluster, formatShortcut, Kbd, Text, Tooltip } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Kbd, formatShortcut, ariaKeyShortcuts],
  whenToUse: [
    'Showing a shortcut where people will learn it: a tooltip (`Tooltip shortcut`), a menu item (`MenuItem.shortcut`), a command palette row, the shortcuts overlay. Pass `keys` in shortcut notation (`mod+k`, `g i`).',
    'Naming a key in a hint: “<Kbd>Tab</Kbd> to accept”, one Kbd per key (`children`, the key as printed).',
    '`formatShortcut` where only a string fits; `ariaKeyShortcuts` for the `aria-keyshortcuts` attribute of a control the system doesn’t already set it on.',
  ],
  whenNotToUse: [
    { situation: 'Registering the shortcut itself', instead: '`useShortcut` (Kbd only shows keys)' },
    { situation: 'Code, a command or a value to copy', instead: '`CodeBlock`, or inline `<code>`' },
    { situation: 'A clickable shortcut', instead: 'a `Button` whose label names the action; show the key beside it or in its tooltip' },
  ],
  do: {
    caption: 'Notation, not glyphs: `mod+k` shows ⌘K on a Mac and Ctrl K elsewhere, from the string the shortcut is registered with; a hint names its keys.',
    render: () => (
      <Cluster gap="md" align="center">
        <Tooltip content="Search and run commands" shortcut="mod+k">
          <Button variant="secondary" icon="search">
            Search
          </Button>
        </Tooltip>
        <Text>
          <Kbd>Tab</Kbd> to accept · <Kbd>Esc</Kbd> to dismiss
        </Text>
      </Cluster>
    ),
  },
  dont: {
    caption: 'A combination typed into one cap, or a hard-coded ⌘: one strange key, wrong on Windows, and read as “place of interest sign”. Use `keys="shift+enter"`.',
    render: () => (
      <Text>
        Press <Kbd>Shift+Enter</Kbd> or ⌘K
      </Text>
    ),
  },
  accessibility: [
    'Renders `<kbd>`. Symbols from `keys` (⌘ ⇧ ⌥ ⌃ ↵ arrows) carry a visually hidden spoken name; with `children`, name keys with words people say (“Esc”, “Enter”).',
    'Showing a shortcut isn’t announcing it: `Tooltip shortcut` and `MenuItem.shortcut` also set `aria-keyshortcuts` on the control.',
    'A hint with keys needs a pointer path too: a visible button for the same action. Single-key shortcuts can be turned off (WCAG 2.2 SC 2.1.4) in the shortcuts overlay.',
  ],
};
