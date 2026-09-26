import { Box, SplitView, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [SplitView],
  whenToUse: [
    'Working through a list one item at a time without losing your place: an inbox, a review queue, support tickets, a file browser.',
    'When people move between neighbouring items often (j and k), so opening each on its own page would cost a round trip.',
  ],
  whenNotToUse: [
    { situation: 'A list people scan and filter, then open one thing', instead: 'the list page (`ListPage`) and a record page' },
    { situation: 'A record with properties beside it', instead: '`PageLayout` with an aside' },
  ],
  do: {
    caption: 'Both regions named; the page keeps the selection (in the URL) and passes `show` for narrow screens.',
    render: () => (
      <SplitView
        listLabel="Conversations"
        detailLabel="Conversation"
        list={<Text>Northwind renewal · Contoso invoice · …</Text>}
        detail={<Text>Northwind renewal: the conversation.</Text>}
      />
    ),
  },
  dont: {
    caption: 'Two boxes side by side by hand: no resizing, no keyboard, and on a phone both squeeze into half a screen.',
    render: () => (
      <Box padding="md">
        <Text>List | Detail</Text>
      </Box>
    ),
  },
  accessibility: [
    'Each pane is a named region and scrolls on its own, with the scroll-padding tokens so focus is never hidden at its edges.',
    'The divider is a focusable separator (aria-valuenow is the list’s width in percent): ← → resize by 5%, Home and End go to the limits; a click steps through preset widths, the single-pointer alternative to dragging (WCAG 2.2 SC 2.5.7).',
    'Below the sm breakpoint it collapses to one pane; `onBack` adds a Back button above the detail. Move focus into the detail when it opens, and back to the row on Back.',
  ],
};
