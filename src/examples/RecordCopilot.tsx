/**
 * GOLDEN EXAMPLE (AI): a copilot beside a record. The record page is the existing one, untouched;
 * the assistant joins its shell through WithAssistant, as an AssistantPanel in AppShell's
 * assistant slot (a Drawer on narrow screens).
 *
 * What it shows:
 *   grounded     it answers about this record only, from what the person can see; every claim cites
 *                a record field or an activity entry, and each citation follows through to its
 *                source under the answer, which links to where it lives in the record
 *   provenance   tool activity ("Read Master cleaning agreement and its activity"), collapsed
 *   control      Stop while it streams (what arrived stays), Retry, Edit a question, Copy, Feedback
 *   honest       an out-of-scope question gets a one-line refusal; a rate limit, a content filter and
 *                a dropped connection each say what happened and offer Retry
 *   empty        suggested questions, never a blank box
 *
 * Data: useAssistant (src/app/model/ai.ts) with the record as context. It sends the record's id,
 * never its contents: the server reads it as the person (canSee), in their workspace.
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AssistantPanel, Button, ChatThread, Cluster, Composer, EmptyState, Stack } from '../index';
import { useAssistant } from '../app/model/ai';
import { useRecord } from '../app/model/queries';
import { useSession } from '../app/session';
import { turnMessages } from './AssistantTurns';
import { WithAssistant } from './ExampleShell';
import { RecordPage } from './RecordPage';

const SUGGESTED = ['When does this renew?', 'Who owns it?', 'Summarise this record'] as const;

export interface RecordCopilotProps {
  /** The record's id, from the route. */
  recordId?: string;
  /** Ask this once the record has loaded (gallery and tests). */
  initialPrompt?: string;
  /** Stop the answer once this many words have arrived (gallery and tests: the stopped state, pinned). */
  initialStopAfter?: number;
  /** Start with the panel closed to its launcher. */
  defaultOpen?: boolean;
}

export function RecordCopilot({ recordId = 'r-1001', ...props }: RecordCopilotProps) {
  return (
    <WithAssistant panel={<CopilotPanel recordId={recordId} {...props} />}>
      <RecordPage recordId={recordId} />
    </WithAssistant>
  );
}

function CopilotPanel({ recordId, initialPrompt, initialStopAfter, defaultOpen = true }: RecordCopilotProps & { recordId: string }) {
  const record = useRecord(recordId);
  const you = useSession().user.name;
  const assistant = useAssistant({ context: { kind: 'record', id: recordId } });
  const [draft, setDraft] = useState('');

  // Gallery and tests: ask once the record is here, once.
  const asked = useRef(false);
  const askInitial = useEffectEvent(() => {
    if (!initialPrompt || asked.current) return;
    asked.current = true;
    assistant.ask(initialPrompt);
  });
  const loaded = record.isSuccess;
  useEffect(() => {
    if (loaded) askInitial();
  }, [loaded]);

  // Gallery and tests: stop once a set number of words has arrived, so the stopped state is pinned.
  const words = assistant.turns.at(-1)?.text.split(/\s+/).filter(Boolean).length ?? 0;
  const stopNow = useEffectEvent(() => assistant.stop());
  const reached = initialStopAfter !== undefined && words >= initialStopAfter;
  useEffect(() => {
    if (reached) stopNow();
  }, [reached]);

  const name = record.data?.name ?? 'this record';
  return (
    <AssistantPanel title="Assistant" launcherLabel="Ask AI" defaultOpen={defaultOpen}>
      <ChatThread
        label={`Conversation about ${name}`}
        empty={
          <EmptyState
            reason="first-use"
            title="Ask about this record"
            description="Answers come from this record’s fields and activity, and cite them."
            action={
              <Stack gap="xs">
                {SUGGESTED.map((prompt) => (
                  <Cluster key={prompt} gap="xs">
                    <Button variant="secondary" size="sm" icon="sparkle" onClick={() => assistant.ask(prompt)}>
                      {prompt}
                    </Button>
                  </Cluster>
                ))}
              </Stack>
            }
          />
        }
      >
        {turnMessages(assistant.turns, { you, onRetry: assistant.retry, onEdit: setDraft })}
      </ChatThread>
      <Composer
        label={`Ask about ${name}`}
        placeholder="Ask about this record…"
        value={draft}
        onValueChange={setDraft}
        onSend={assistant.ask}
        streaming={assistant.streaming}
        onStop={assistant.stop}
        maxLength={2000}
      />
    </AssistantPanel>
  );
}
