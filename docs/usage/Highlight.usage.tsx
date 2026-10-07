import { Highlight, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Highlight],
  whenToUse: [
    'Marking a passage in running text: the reader’s own highlights (the default tone), Find’s matches (`tone="search"`), or what an AI answer cites (`tone="ai"`).',
    'Tones can show together; each colour keeps one meaning wherever it appears, in a DocumentViewer, search results or a chat answer’s source.',
    'Give a highlight an `id` when something links to it (a citation, a search result), so the link can scroll to it.',
  ],
  whenNotToUse: [
    { situation: 'A status or a category', instead: '`Badge` or `Tag`' },
    { situation: 'Emphasis the author wrote', instead: 'the text’s own `<strong>` or `<em>`' },
    { situation: 'An AI suggestion not yet accepted', instead: '`AiMarker`' },
  ],
  do: {
    caption: 'One meaning per colour: the reader’s highlight in yellow, the passage an answer cites in purple.',
    render: () => (
      <Text size="body-lg">
        The agreement <Highlight tone="ai">automatically renews</Highlight> unless either party gives <Highlight>sixty days’ notice</Highlight>.
      </Text>
    ),
  },
  dont: {
    caption: 'Highlighting a whole paragraph: nothing stands out, and the colour stops meaning anything.',
    render: () => (
      <Text size="body-lg">
        <Highlight>The agreement automatically renews for successive 12-month terms unless either party gives sixty days’ notice before the renewal date.</Highlight>
      </Text>
    ),
  },
  accessibility: [
    'A highlight is a `<mark>`, which screen readers can announce as highlighted text.',
    'Its background is its only visual mark, so every highlight must also be reachable without colour: Find’s results, or the citation that points to it by `id`.',
    'Text keeps its own colour on every tone, and every tone passes contrast in light and dark (contrast test).',
  ],
};
