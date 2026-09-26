import { Kbd, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Kbd],
  whenToUse: ['A key the person presses, named in a hint or a list of shortcuts: “Tab to accept”, “Shift Enter for a new line”.', 'One Kbd per key; a combination is several side by side.'],
  whenNotToUse: [
    { situation: 'Code, a command or a value to copy', instead: '`CodeBlock`, or inline `<code>`' },
    { situation: 'A clickable shortcut', instead: 'a `Button` whose label names the action; mention the key beside it' },
  ],
  do: {
    caption: 'The hint names the keys and what they do.',
    render: () => (
      <Text>
        <Kbd>Tab</Kbd> to accept · <Kbd>Esc</Kbd> to dismiss
      </Text>
    ),
  },
  dont: {
    caption: 'A combination in one cap reads as one strange key.',
    render: () => (
      <Text>
        Press <Kbd>Shift+Enter</Kbd>
      </Text>
    ),
  },
  accessibility: [
    'Renders `<kbd>`, which screen readers read as plain text: the key names must be words people say (“Esc”, “Enter”), with symbols (⌘) only beside a word.',
    'A hint with keys needs a pointer path too: a visible button for the same action.',
  ],
};
