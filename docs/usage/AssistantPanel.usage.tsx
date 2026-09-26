import { AssistantPanel, Button, ChatThread, Composer, Drawer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [AssistantPanel],
  whenToUse: [
    'An assistant that works beside the page it’s about (a record’s copilot): pass it as AppShell’s `assistant`, with a `ChatThread` over a `Composer` as its content.',
    'People resize it (drag the edge, arrow keys on the edge, or Widen / Narrow) and close it to a launcher; the width is remembered under `storageKey`.',
    'Below `size.breakpoint.md` it becomes a launcher in the header that opens the same content in a `Drawer`. Keep the conversation’s state in the page, not in the panel: the content moves between the two.',
  ],
  whenNotToUse: [
    { situation: 'A conversation that is the page', instead: 'a full chat page (the Assistant chat example) inside `AppShell`' },
    { situation: 'One AI suggestion inside a form', instead: '`Suggestion` beside the field' },
    { situation: 'Details or filters for the page', instead: '`Drawer` or `PageLayout`’s aside' },
  ],
  do: {
    caption: 'A thread over a composer, filling the panel; the page stays usable beside it.',
    render: () => (
      <AssistantPanel title="Assistant (do example)" storageKey={null}>
        <ChatThread label="Conversation (do example)" empty={<Text tone="muted">Ask about this record.</Text>} />
        <Composer label="Ask (do example)" onSend={() => undefined} />
      </AssistantPanel>
    ),
  },
  dont: {
    caption: 'A modal drawer for the assistant on a wide screen: it covers the page the answers are about.',
    render: () => <Drawer title="Assistant (don’t example)" trigger={<Button variant="secondary">Ask AI</Button>} />,
  },
  accessibility: [
    'The panel is a complementary landmark named by its heading. Opening it moves focus into it; closing it returns focus to the launcher.',
    'The resize edge is a focusable separator with `aria-valuenow`, `aria-valuemin` and `aria-valuemax` (CSS pixels); arrow keys resize it (Shift for bigger steps), Home and End jump to the limits. Widen / Narrow is the single-pointer alternative to dragging (WCAG 2.5.7).',
    'Narrow, the Drawer brings its focus trap, Escape and focus return.',
  ],
};
