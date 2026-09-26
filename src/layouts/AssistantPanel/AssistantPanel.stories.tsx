import type { Meta, StoryObj } from '@storybook/react-vite';
import { DemoNarrow } from '../../../.storybook/DemoBox';
import { Button } from '../../components/Button/Button';
import { ChatThread } from '../../components/ChatThread/ChatThread';
import { Composer } from '../../components/Composer/Composer';
import { Heading } from '../../components/Heading/Heading';
import { Message } from '../../components/Message/Message';
import { Nav } from '../../components/Nav/Nav';
import { StreamingText } from '../../components/StreamingText/StreamingText';
import { Text } from '../../components/Text/Text';
import { Center } from '../../primitives/Center/Center';
import { Stack } from '../../primitives/Stack/Stack';
import { AppShell } from '../AppShell/AppShell';
import { AssistantPanel, type AssistantPanelProps } from './AssistantPanel';

const conversation = (
  <>
    <ChatThread label="Conversation about Master cleaning agreement">
      <Message key="1" role="user" author="Sam Rivera" time="2026-09-14T10:04:00Z">
        When does this renew?
      </Message>
      <Message key="2" role="assistant" author="Assistant" time="2026-09-14T10:04:05Z" copyText="It renews on 15 January 2027.">
        <StreamingText text="It renews on **15 January 2027**, unless either side gives sixty days’ notice." />
      </Message>
    </ChatThread>
    <Composer label="Ask about this record" placeholder="Ask about this record…" onSend={() => undefined} />
  </>
);

/** The panel in the frame it belongs to: AppShell's assistant slot, beside a page. */
function InShell(props: Partial<AssistantPanelProps>) {
  return (
    <AppShell
      brand="Acme"
      sidebarStorageKey={null}
      nav={<Nav label="Main" current="/records" sections={[{ items: [{ label: 'Records', href: '/records', icon: 'file' }] }]} />}
      assistant={
        <AssistantPanel title="Assistant" storageKey={null} {...props}>
          {conversation}
        </AssistantPanel>
      }
    >
      <Center max="lg" gutters="lg">
        <Stack gap="sm">
          <Heading level={1}>Master cleaning agreement</Heading>
          <Text tone="muted">The page keeps its own scrolling; the assistant sits beside it.</Text>
        </Stack>
      </Center>
    </AppShell>
  );
}

const meta = {
  title: 'Layouts/AssistantPanel',
  component: AssistantPanel,
  args: { title: 'Assistant', children: conversation, storageKey: null },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AssistantPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { render: () => <InShell /> };
/** Closed to a launcher at the edge; the page takes the width back. */
export const Closed: Story = { render: () => <InShell defaultOpen={false} launcherLabel="Ask AI" /> };
export const WithHeaderActions: Story = {
  render: () => (
    <InShell
      actions={
        <Button variant="ghost" size="sm" icon="plus">
          New chat
        </Button>
      }
    />
  ),
};
/** Narrow: the launcher sits in the header row. */
export const Narrow: Story = {
  render: () => (
    <DemoNarrow>
      <InShell launcherLabel="Ask AI" />
    </DemoNarrow>
  ),
};
/** Narrow, opened: the same content in a Drawer. */
export const NarrowOpen: Story = {
  tags: ['modal-open', '!autodocs'],
  render: () => (
    <DemoNarrow>
      <InShell launcherLabel="Ask AI" defaultDrawerOpen />
    </DemoNarrow>
  ),
};
