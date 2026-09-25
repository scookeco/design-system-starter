import { Button, Cluster, CopyButton, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [CopyButton],
  whenToUse: [
    'A value people paste elsewhere: an API key, an invite link, an ID, a command.',
    'Set `accessibleName` when several copy buttons sit on one page (“Copy API key”); it starts with the visible label so voice control still matches.',
  ],
  whenNotToUse: [
    { situation: 'Code or a command', instead: '`CodeBlock`, which includes one' },
    { situation: 'Sharing through the platform (email, Slack)', instead: 'a `Button` that opens the share flow' },
  ],
  do: {
    caption: 'The value is visible, with a copy button beside it.',
    render: () => (
      <Cluster gap="sm">
        <Text as="span">
          <code>wsk_3f9a1c7e20b4</code>
        </Text>
        <CopyButton text="wsk_3f9a1c7e20b4" accessibleName="Copy API key" />
      </Cluster>
    ),
  },
  dont: {
    caption: 'A generic button that copies silently: nobody knows whether it worked.',
    render: () => (
      <Button variant="secondary" size="sm">
        Copy
      </Button>
    ),
  },
  accessibility: [
    'On success the label reads “Copied” and a polite live region, present from mount, announces it; it reverts after `revertAfter` ms.',
    'If the browser blocks the clipboard, it announces `failedMessage`, so keep the value visible and selectable.',
  ],
};
