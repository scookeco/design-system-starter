/**
 * GOLDEN EXAMPLE (AI): a full chat page, for questions that span the workspace.
 *
 * Anatomy:
 *   shell     AppShell via ExampleShell; the Composer sits in the sticky footer and the thread grows in
 *             main, which follows the output (ChatThread scroll="page")
 *   header    PageHeader: the conversation's title | New chat · More (Rename, Delete)
 *   history   PageLayout's nav slot: the person's conversations, newest first, as a Nav; the open one
 *             is in the URL (/assistant?c=c-3), so a link reopens it
 *   thread    the turns (AssistantTurns): answers with tool activity, citations and sources; refusals;
 *             failures with Retry; Copy, Edit, Feedback
 *   states    loading, a new chat with suggested questions, no history yet, a conversation that no
 *             longer exists
 *
 * Data: conversations are server state (useConversations, useConversation, and the named verbs in
 * src/app/model/ai.ts); the turns of the open conversation are the page's, seeded from the stored
 * messages. A first question in a new chat creates the conversation, then asks into it; the server
 * stores the exchange and names the chat after the question.
 */
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react';
import { Button, Center, ChatThread, Cluster, Composer, Dialog, EmptyState, Menu, Nav, PageHeader, PageLayout, Skeleton, Stack, Text, TextField } from '../index';
import { turnFromStored, useAssistant, useConversation, useConversations, useCreateConversation, useDeleteConversation, useRenameConversation } from '../app/model/ai';
import { useSession } from '../app/session';
import { WORKSPACES } from '../app/workspaces';
import { useTenant } from '../app/tenant';
import { chatCodec } from '../app/url/chatState';
import { useUrlState } from '../app/url/useUrlState';
import { turnMessages } from './AssistantTurns';
import { ExampleShell } from './ExampleShell';

const SUGGESTED = ['How many records are overdue?', 'What can you help with?'] as const;

export interface AssistantChatPageProps {
  /** Ask this on mount, in a new chat (gallery and tests). */
  initialPrompt?: string;
  /** Stop the answer once this many words have arrived (gallery and tests: the stopped state, pinned). */
  initialStopAfter?: number;
  /** Open the rename or delete dialog for the open conversation (gallery and tests). */
  initialDialog?: 'rename' | 'delete';
}

export function AssistantChatPage({ initialPrompt, initialStopAfter, initialDialog }: AssistantChatPageProps) {
  const tenant = useTenant();
  const you = useSession().user.name;
  const [url, setUrl] = useUrlState(chatCodec);
  const open = url.c === '' ? undefined : url.c;
  const conversations = useConversations();
  const conversation = useConversation(open);
  const create = useCreateConversation();
  const rename = useRenameConversation();
  const remove = useDeleteConversation();
  const assistant = useAssistant({ context: { kind: 'workspace' }, conversationId: open });
  const [draft, setDraft] = useState('');
  const [dialog, setDialog] = useState(initialDialog);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | undefined>();

  // The turns follow the open conversation: seeded from its stored messages when it first loads.
  // A conversation this page just created is already showing its turns, so it isn't reseeded.
  const seeded = useRef<string | undefined>(undefined);
  const reseed = useEffectEvent(() => {
    if (!conversation.data || seeded.current === conversation.data.id) return;
    seeded.current = conversation.data.id;
    assistant.reset(conversation.data.messages.map(turnFromStored));
    setTitle(conversation.data.title);
  });
  const loadedId = conversation.data?.id;
  useEffect(() => {
    reseed();
  }, [loadedId]);

  const openConversation = (id: string) => {
    if (id === open) return;
    seeded.current = undefined;
    assistant.reset();
    setUrl.push({ c: id });
  };

  const newChat = () => {
    seeded.current = undefined;
    assistant.reset();
    setDraft('');
    setUrl.push({ c: '' });
  };

  /** Ask in the open conversation; in a new chat, create the conversation first, then ask into it. */
  const ask = async (prompt: string) => {
    if (open) return assistant.ask(prompt);
    const created = await create.mutateAsync();
    seeded.current = created.id;
    setUrl.replace({ c: created.id });
    return assistant.ask(prompt, { conversationId: created.id });
  };

  // Gallery and tests: ask on mount.
  const asked = useRef(false);
  const askOnMount = useEffectEvent(() => {
    if (!initialPrompt || open || asked.current) return;
    asked.current = true;
    void ask(initialPrompt);
  });
  useEffect(() => {
    askOnMount();
  }, []);
  // Gallery and tests: stop once a set number of words has arrived, so the stopped state is pinned.
  const words = assistant.turns.at(-1)?.text.split(/\s+/).filter(Boolean).length ?? 0;
  const stopNow = useEffectEvent(() => assistant.stop());
  const reached = initialStopAfter !== undefined && words >= initialStopAfter;
  useEffect(() => {
    if (reached) stopNow();
  }, [reached]);

  const current = conversations.data?.find((c) => c.id === open);
  const heading = open ? (current?.title ?? conversation.data?.title ?? 'Conversation') : 'New chat';

  const saveTitle = (event?: FormEvent) => {
    event?.preventDefault();
    const next = title.trim();
    if (!open) return;
    if (next === '') {
      setTitleError('Name the conversation.');
      return;
    }
    rename.mutate({ id: open, title: next }, { onSuccess: () => setDialog(undefined), onError: (error) => setTitleError(error.message) });
  };

  const history = conversations.isPending ? (
    <Skeleton lines={4} />
  ) : conversations.isError ? (
    <Text tone="muted">Your conversations couldn’t be loaded.</Text>
  ) : conversations.data.length === 0 ? (
    <Text tone="muted">No conversations yet. Ask something to start one.</Text>
  ) : (
    <Nav
      label="Conversations"
      current={open ? `/assistant?c=${open}` : ''}
      onNavigate={(href) => openConversation(href.split('c=')[1] ?? '')}
      sections={[{ label: 'Recent', items: conversations.data.map((c) => ({ label: c.title, href: `/assistant?c=${c.id}` })) }]}
    />
  );

  const thread =
    open && conversation.isError ? (
      <EmptyState
        reason="error"
        title="This conversation isn’t available"
        description="It may have been deleted. Your other conversations are in the list."
        action={<Button variant="secondary" onClick={newChat}>New chat</Button>}
      />
    ) : open && conversation.isPending ? (
      <Stack gap="md" aria-busy="true">
        <Skeleton lines={3} />
        <Text size="caption" tone="muted" aria-live="polite">
          Loading conversation…
        </Text>
      </Stack>
    ) : (
      <ChatThread
        scroll="page"
        label={heading}
        empty={
          <EmptyState
            reason="first-use"
            title={`Ask about ${WORKSPACES[tenant].name}`}
            description="Answers come from the records you can see, and say where they came from."
            action={
              <Cluster gap="xs">
                {SUGGESTED.map((prompt) => (
                  <Button key={prompt} variant="secondary" size="sm" icon="sparkle" onClick={() => void ask(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </Cluster>
            }
          />
        }
      >
        {turnMessages(assistant.turns, { you, onRetry: assistant.retry, onEdit: setDraft })}
      </ChatThread>
    );

  return (
    <ExampleShell
      current=""
      footer={
        <Center max="lg" gutters="lg">
          <Composer
            label="Ask the assistant"
            placeholder={`Ask about ${WORKSPACES[tenant].name}…`}
            value={draft}
            onValueChange={setDraft}
            onSend={(text) => void ask(text)}
            streaming={assistant.streaming || create.isPending}
            onStop={assistant.stop}
            maxLength={4000}
          />
        </Center>
      }
    >
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          <PageHeader
            title={heading}
            description={`The assistant answers from the records you can see in ${WORKSPACES[tenant].name}, as you.`}
            actions={
              <>
                <Button variant="secondary" icon="plus" onClick={newChat}>
                  New chat
                </Button>
                {open ? (
                  <Menu
                    align="end"
                    trigger={
                      <Button variant="secondary" icon="more">
                        More
                      </Button>
                    }
                    items={[
                      {
                        label: 'Rename',
                        onSelect: () => {
                          setTitle(heading);
                          setTitleError(undefined);
                          setDialog('rename');
                        },
                      },
                      'separator',
                      { label: 'Delete conversation', tone: 'danger', onSelect: () => setDialog('delete') },
                    ]}
                  />
                ) : null}
              </>
            }
          />
          <PageLayout nav={history}>{thread}</PageLayout>
        </Stack>
      </Center>

      <Dialog
        size="sm"
        title="Rename conversation"
        open={dialog === 'rename'}
        onOpenChange={(next) => setDialog(next ? 'rename' : undefined)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button loading={rename.isPending} onClick={() => saveTitle()}>
              Save name
            </Button>
          </>
        }
      >
        <Stack as="form" gap="md" onSubmit={saveTitle}>
          <TextField label="Name" value={title} onChange={(event) => setTitle(event.target.value)} error={titleError} autoComplete="off" />
        </Stack>
      </Dialog>

      <Dialog
        size="sm"
        title="Delete this conversation?"
        description={`“${heading}” and its answers will be removed. This can’t be undone.`}
        open={dialog === 'delete'}
        onOpenChange={(next) => {
          if (!remove.isPending) setDialog(next ? 'delete' : undefined);
        }}
        footer={
          <>
            <Button variant="secondary" disabled={remove.isPending} onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => {
                if (open)
                  remove.mutate(open, {
                    onSuccess: () => {
                      setDialog(undefined);
                      newChat();
                    },
                  });
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete conversation'}
            </Button>
          </>
        }
      />
    </ExampleShell>
  );
}
