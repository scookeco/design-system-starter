import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { ShortcutHelp, useShortcut } from './Shortcuts';

const noop = () => undefined;

/** A page's shortcuts, registered while it's mounted: they appear in the overlay under their scope. */
function InboxShortcuts() {
  useShortcut({ id: 'palette.open', keys: 'mod+k', description: 'Open the command palette', handler: noop, allowInInputs: true });
  useShortcut({ id: 'go.inbox', keys: 'g i', description: 'Go to Inbox', handler: noop });
  useShortcut({ id: 'inbox.next', keys: 'j', description: 'Next conversation', scope: 'Inbox', handler: noop });
  useShortcut({ id: 'inbox.previous', keys: 'k', description: 'Previous conversation', scope: 'Inbox', handler: noop });
  useShortcut({ id: 'inbox.archive', keys: 'e', description: 'Archive', scope: 'Inbox', handler: noop });
  return null;
}

const meta = {
  title: 'Components/ShortcutHelp',
  component: ShortcutHelp,
  args: { platform: 'mac' },
  decorators: [
    (Story) => (
      <>
        <InboxShortcuts />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof ShortcutHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: press ? anywhere on the page (outside a text field), or use the trigger. */
export const WithTrigger: Story = { args: { trigger: <Button variant="secondary">Keyboard shortcuts</Button> } };
/** Every active shortcut, grouped by scope, with the switch that turns single-key shortcuts off. */
export const Open: Story = { tags: ['modal-open', '!autodocs'], args: { defaultOpen: true } };
export const OpenOnWindows: Story = { tags: ['modal-open', '!autodocs'], args: { defaultOpen: true, platform: 'other' } };
