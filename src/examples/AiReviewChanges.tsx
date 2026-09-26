/**
 * GOLDEN EXAMPLE (AI): an agent that proposes bulk changes, reviewed before anything happens.
 *
 *   ask        one scoped task ("Move overdue records that have a renewal on file to Pending"),
 *              disabled with the reason when the person can't move records
 *   work       the agent's steps (search, permission check) as collapsed tool activity, and a
 *              short answer that cites the list it read
 *   consent    ReviewChanges: every change as a diff with its reason; nothing is applied until the
 *              person accepts changes and chooses Apply. A change they couldn't make is shown with
 *              the reason, never silently dropped
 *   apply      the existing named mutation, moveRecord, once per accepted change: the same `can`
 *              refuses it before sending, the server checks again, and a stale proposal gets a 409
 *              that is reported per change (partial failure)
 *   undo       one Undo moves every applied record back, using the version each move returned
 *
 * The agent has no permissions of its own: it proposes only what the person could do by hand, and
 * applying goes through the same write path as the board's Move to….
 */
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AiMarker, Button, Card, CardBody, Center, Cluster, PageHeader, ReviewChanges, Stack, Text, type ChangeDecision, type ProposedChange } from '../index';
import type { ProposedMove } from '../app/api/ai';
import { useApplyProposal, useAssistant } from '../app/model/ai';
import { useRecordCounts } from '../app/model/queries';
import { STATUS } from '../app/model/status';
import { usePermission } from '../app/session';
import { turnMessages } from './AssistantTurns';
import { ExampleShell } from './ExampleShell';
import { gated, PermissionNote } from './Permission';

const TASK = 'Move overdue records that have a renewal on file to Pending';

export interface AiReviewChangesProps {
  /** Ask the agent once the page has loaded (gallery and tests). */
  initialRun?: boolean;
  /** Accept every proposed change, then apply them (gallery and tests). */
  initialApply?: boolean;
  /** After applying, undo (gallery and tests). */
  initialUndo?: boolean;
}

const toChange = (move: ProposedMove): ProposedChange => ({
  id: move.recordId,
  target: move.name,
  field: 'Status',
  before: STATUS[move.before].label,
  after: STATUS[move.after].label,
  reason: move.reason,
});

export function AiReviewChanges({ initialRun = false, initialApply = false, initialUndo = false }: AiReviewChangesProps) {
  const permission = usePermission('record:move');
  // What the agent will read: the overdue records this person can see, counted by the server.
  const counts = useRecordCounts({ q: '', status: [] });
  const overdue = counts.data?.statuses.overdue;
  const assistant = useAssistant({ context: { kind: 'records', status: 'overdue' } });
  const [decisions, setDecisions] = useState<Record<string, ChangeDecision>>({});

  const answer = assistant.turns.findLast((t) => t.role === 'assistant');
  const proposal = answer?.status === 'complete' ? answer.proposal : undefined;
  const changes: ProposedChange[] = [
    ...(proposal?.changes ?? []).map(toChange),
    ...(proposal?.skipped ?? []).map((s) => ({ id: s.recordId, target: s.name, field: 'Status', before: STATUS.overdue.label, after: STATUS.pending.label, blockedReason: s.reason })),
  ];

  const { apply: applyAll, undo: undoAll } = useApplyProposal();

  const outcomes = applyAll.data?.outcomes;
  const undone = undoAll.isSuccess;
  const reset = () => {
    setDecisions({});
    applyAll.reset();
    undoAll.reset();
    assistant.reset();
  };
  const run = () => {
    reset();
    return assistant.ask(TASK);
  };

  // Gallery and tests: run on mount, then (chained, so the page is never idle in between) accept
  // everything and apply it, then undo.
  const started = useRef(false);
  const runOnMount = useEffectEvent(() => {
    if (!initialRun || started.current) return;
    started.current = true;
    void run().then(async (turn) => {
      const moves = turn.proposal?.changes ?? [];
      if (!initialApply || moves.length === 0) return;
      const ids = moves.map((m) => m.recordId);
      setDecisions(Object.fromEntries(ids.map((id) => [id, 'accepted'])));
      const result = await applyAll.mutateAsync({ ids, moves });
      if (initialUndo) await undoAll.mutateAsync(result.applied);
    });
  });
  useEffect(() => {
    runOnMount();
  }, []);

  return (
    <ExampleShell current="/records" trail={{ items: [{ label: 'Records', href: '/records' }], current: 'Tidy overdue records' }}>
      <Center max="lg" gutters="lg">
        <Stack gap="lg">
          <PageHeader
            title="Tidy overdue records"
            description="The assistant proposes changes to records you could change yourself. Nothing changes until you review and apply them."
            actions={
              <Button icon="sparkle" variant="secondary" loading={assistant.streaming} onClick={() => void run()} {...gated(permission)}>
                {assistant.streaming ? 'Proposing…' : answer ? 'Propose again' : 'Propose changes'}
              </Button>
            }
          />
          <PermissionNote permission={permission} />
          <Card>
            <CardBody>
              <Stack gap="md">
                <Cluster gap="sm">
                  <Text>{`Task: ${TASK}.`}</Text>
                  <AiMarker variant="inline">Runs as you</AiMarker>
                </Cluster>
                {answer ? (
                  <Stack as="ol" gap="md" role="list">
                    {turnMessages(assistant.turns.filter((t) => t.role === 'assistant'), { you: '', onRetry: assistant.retry, onEdit: () => undefined }).map((message) => (
                      <li key={message.key}>{message}</li>
                    ))}
                  </Stack>
                ) : (
                  <Text tone="muted">
                    {`Choose Propose changes. The assistant reads the ${overdue === undefined ? '' : `${String(overdue)} `}overdue records you can see and proposes a change for each one with a renewal on file.`}
                  </Text>
                )}
              </Stack>
            </CardBody>
          </Card>
          {proposal && changes.length > 0 ? (
            <ReviewChanges
              title={`Proposed changes to ${String(proposal.changes.length)} records`}
              changes={changes}
              decisions={decisions}
              onDecisionsChange={setDecisions}
              onApply={(ids) => applyAll.mutate({ ids, moves: proposal.changes })}
              applying={applyAll.isPending}
              {...(outcomes ? { outcomes } : {})}
              onUndo={() => undoAll.mutate(applyAll.data?.applied ?? [])}
              undoing={undoAll.isPending}
              undone={undone}
            />
          ) : null}
        </Stack>
      </Center>
    </ExampleShell>
  );
}
