/**
 * How the examples render assistant turns: one Message per turn, built from the typed turn the app
 * layer keeps (src/app/model/ai.ts). Shared by the record copilot and the chat page, so both show
 * provenance, refusals, failures and actions the same way.
 *
 *   user turn        tinted, with Copy and Edit (Edit puts the question back in the composer)
 *   assistant turn   tool activity (collapsed), the answer as StreamingText with numbered citations
 *                    that follow through to the SourcesList under it; Copy, Retry and Feedback once
 *                    finished
 *   refusal          the assistant's one-line reason, marked as out of scope or as a permission limit
 *   failure          what went wrong in words, with Retry (rate limit, content filter, network)
 */
import { useId, useState } from 'react';
import { Badge, Disclosure, Feedback, Message, SourcesList, Stack, StreamingText, Citation, Text } from '../index';
import type { AssistantTurn } from '../app/model/ai';

const REFUSAL_LABEL = { out_of_scope: 'Outside what I can help with', permission: 'Beyond your permissions' } as const;

function AssistantAnswer({ turn }: { turn: AssistantTurn }) {
  const sourcesId = useId();
  const [active, setActive] = useState<number>();
  const cite = (n: number) => {
    const source = turn.sources[n - 1];
    return source ? <Citation number={n} sources={sourcesId} title={source.title} onActivate={setActive} /> : null;
  };
  return (
    <Stack gap="sm">
      {turn.tools.map((tool) => (
        <Disclosure key={tool.id} summary={tool.summary} meta={<Badge tone={tool.status === 'done' ? 'success' : 'info'}>{tool.status === 'done' ? `${tool.name}: done` : `${tool.name}…`}</Badge>}>
          <Text size="caption" tone="muted">
            {tool.detail ?? `${tool.name} ran as you, with your access in this workspace.`}
          </Text>
        </Disclosure>
      ))}
      {turn.refusal ? (
        <Stack gap="xs">
          <Badge tone="neutral">{REFUSAL_LABEL[turn.refusal.reason]}</Badge>
          <StreamingText text={turn.refusal.message} />
        </Stack>
      ) : turn.text !== '' || turn.status === 'pending' || turn.status === 'streaming' ? (
        <StreamingText text={turn.text} status={turn.status} citation={cite} />
      ) : null}
      {turn.sources.length > 0 && turn.status !== 'pending' && turn.status !== 'streaming' ? (
        <SourcesList id={sourcesId} sources={turn.sources} active={active} />
      ) : null}
    </Stack>
  );
}

export interface TurnHandlers {
  /** The person's display name, on their own turns. */
  you: string;
  onRetry: (answerId: string) => void;
  onEdit: (text: string) => void;
}

/** One Message element per turn, keyed, for a ChatThread. */
export function turnMessages(turns: readonly AssistantTurn[], { you, onRetry, onEdit }: TurnHandlers) {
  return turns.map((turn) =>
    turn.role === 'user' ? (
      <Message key={turn.id} role="user" author={you} time={turn.time} copyText={turn.text} onEdit={() => onEdit(turn.text)}>
        {turn.text}
      </Message>
    ) : (
      <Message
        key={turn.id}
        role="assistant"
        author="Assistant"
        {...(turn.status === 'pending' ? {} : { time: turn.time })}
        status={turn.status}
        {...(turn.failure ? { error: turn.failure.message } : {})}
        {...(turn.status === 'complete' || turn.status === 'stopped' ? { copyText: turn.refusal?.message ?? turn.text } : {})}
        onRetry={() => onRetry(turn.id)}
        {...(turn.status === 'complete' && !turn.refusal ? { feedback: <Feedback onFeedback={() => undefined} /> } : {})}
      >
        <AssistantAnswer turn={turn} />
      </Message>
    ),
  );
}
