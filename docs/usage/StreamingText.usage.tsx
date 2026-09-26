import { Spinner, StreamingText } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [StreamingText],
  whenToUse: [
    'An AI answer that arrives token by token: pass everything received so far as `text` and the `status` (pending, streaming, complete, stopped, error).',
    'Any AI output shown as Markdown, streamed or not: it renders safely (no raw HTML, safe links only, no images).',
  ],
  whenNotToUse: [
    { situation: 'Text a person wrote', instead: '`Text`: Markdown rendering belongs to model output' },
    { situation: 'A wait with no partial result', instead: '`Spinner` or `Progress`' },
  ],
  do: {
    caption: 'Partial text with a caret while it arrives; the parent appends, the component renders.',
    render: () => <StreamingText text="It renews on **15 January 2027**, unless either side" status="streaming" />,
  },
  dont: {
    caption: 'A spinner that hides the answer until it’s finished: people wait without seeing progress, and can’t stop early.',
    render: () => <Spinner label="Generating answer" />,
  },
  accessibility: [
    'One polite live region, present from mount, announces “Generating…”, then each sentence or paragraph once it is complete, then “Stopped” if the person stops it. Never token by token, and never the whole answer again at the end.',
    'Text already there on mount (history) isn’t announced.',
    'The caret and the thinking dots are hidden from assistive technology and hold still under reduced motion (`motion.pulse` is 0).',
    'Model output is untrusted: raw HTML renders as text, links are http(s), mailto or in-app only, images are never loaded, and headings become bold text so an answer can’t change the page outline.',
  ],
};
