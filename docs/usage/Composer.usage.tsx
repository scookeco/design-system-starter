import { Composer, TextField } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Composer],
  whenToUse: [
    'Where the person writes to an assistant, pinned under a `ChatThread`: Enter sends, Shift+Enter adds a line, and the box grows with its content.',
    'Set `streaming` while an answer arrives: Send becomes Stop (`onStop`). Typing the next question still works.',
    'Keep the disclaimer (`note`) unless the surface shows it elsewhere; set `maxLength` when the model has a limit.',
  ],
  whenNotToUse: [
    { situation: 'A search box', instead: '`SearchField`' },
    { situation: 'A comment on a record', instead: '`Textarea` with a Comment button' },
  ],
  do: {
    caption: 'Labelled, with the keys and the disclaimer under it.',
    render: () => <Composer label="Ask about this record" placeholder="Ask about this record…" onSend={() => undefined} />,
  },
  dont: {
    caption: 'A one-line field with no Send button: multi-line questions are impossible and nothing says Enter sends.',
    render: () => <TextField label="Ask" />,
  },
  accessibility: [
    'The text box is labelled (`label`, visually hidden) and described by the key hint; the count joins the description from 80% of `maxLength`.',
    'Enter never sends during an IME composition. Over the limit, Send is disabled and the count says by how much; paste is never blocked.',
    'Stop is always reachable while an answer arrives.',
  ],
};
