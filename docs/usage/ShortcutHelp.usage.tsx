import { Button, findShortcutConflicts, isReservedShortcut, RESERVED_SHORTCUTS, ShortcutHelp, useActiveShortcuts, useCharacterKeyShortcuts, useShortcut } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [ShortcutHelp, useShortcut, useActiveShortcuts, useCharacterKeyShortcuts, findShortcutConflicts, isReservedShortcut, RESERVED_SHORTCUTS],
  whenToUse: [
    '`useShortcut` for every keyboard shortcut: global ones in the app’s shell composition, page ones in the page, so they register and unregister with it.',
    '`ShortcutHelp` once, in the shell composition: `?` opens it, and it lists every shortcut active right now, by scope.',
    'A shortcut for something people repeat all day (move through a list, triage, open the palette), always mirroring a visible control.',
  ],
  whenNotToUse: [
    { situation: 'The only way to reach an action', instead: 'a visible button or menu item first; the shortcut is the accelerator' },
    { situation: 'A key the browser or a screen reader owns (copy, find, Tab, arrows, Escape, Control+Option…)', instead: 'another key: the registry refuses reserved keys' },
    { situation: 'Keys inside one widget (arrows in a listbox, Enter in a field)', instead: 'the widget’s own key handling; the registry is for page and app shortcuts' },
  ],
  do: {
    caption: 'One entry point for help, reachable by pointer too; shortcuts registered with a scope and a verb-first description.',
    render: () => <ShortcutHelp trigger={<Button variant="secondary">Keyboard shortcuts</Button>} />,
  },
  dont: {
    caption: 'A bare document keydown listener: invisible in the help overlay, unaware of text fields and dialogs, free to steal keys from assistive technology.',
    render: () => <Button variant="secondary">Archive (press E; no one can find out)</Button>,
  },
  accessibility: [
    'Nothing fires while typing in a field (unless the shortcut sets `allowInInputs`, as ⌘K does), inside a dialog (unless `allowInDialogs`), during IME composition, or after another handler took the key.',
    'Single-key shortcuts can be turned off in the overlay (WCAG 2.2 SC 2.1.4, Character Key Shortcuts); the choice is remembered on this device.',
    'Reserved keys are refused and conflicts are reported (the first registration keeps its keys), so a feature can’t silently break another or the browser.',
    'Pair each shortcut with a visible control that shows it (`Tooltip shortcut`, `MenuItem.shortcut`): shortcuts are accelerators, never the only path.',
  ],
};
