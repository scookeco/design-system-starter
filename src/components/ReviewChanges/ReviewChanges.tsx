import { useState, type ReactNode } from 'react';
import { cx, type EscapeHatch } from '../../internal/closed-api';
import { AiMarker } from '../AiMarker/AiMarker';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Toggle } from '../Toggle/Toggle';
import './ReviewChanges.css';

/** One proposed change: a field's old and new value, or a text rewrite shown word by word. */
export interface ProposedChange {
  id: string;
  /** What it changes, by name ("Master cleaning agreement"). */
  target: string;
  /** Which field ("Status", "Description"). */
  field: string;
  before: string;
  after: string;
  /** field: before → after. text: a word diff of the two. */
  kind?: 'field' | 'text';
  /** Why the AI proposes it ("Overdue for 40 days with a signed renewal in activity"). */
  reason?: string;
  /** Set when it can't be applied (no permission, archived): shown instead of Accept and Reject. */
  blockedReason?: string;
}

export type ChangeDecision = 'accepted' | 'rejected';

/** How each change went once applied: done, or why it failed. */
export type ChangeOutcome = { ok: true } | { ok: false; reason: string };

export interface ReviewChangesProps extends EscapeHatch {
  /** Heading of the review ("Proposed changes to 6 records"). */
  title: string;
  changes: readonly ProposedChange[];
  /** Controlled decisions. Undecided changes are left out: nothing is applied without a decision. */
  decisions?: Readonly<Record<string, ChangeDecision>>;
  defaultDecisions?: Readonly<Record<string, ChangeDecision>>;
  onDecisionsChange?: (decisions: Record<string, ChangeDecision>) => void;
  /** Apply the accepted changes (ids in list order). */
  onApply: (acceptedIds: string[]) => void;
  /** Applying: the button shows progress and the decisions lock. */
  applying?: boolean;
  /** Once applied: each change's outcome by id. Shows the results and Undo. */
  outcomes?: Readonly<Record<string, ChangeOutcome>>;
  /** Restore what was there before. Shown once changes are applied. */
  onUndo?: () => void;
  undoing?: boolean;
  /** The applied changes were undone: says so, and the review is closed. */
  undone?: boolean;
  /** Extra content under the heading: provenance ("Based on 42 records matching Overdue"). */
  summary?: ReactNode;
}

type Part = { text: string; op: 'same' | 'removed' | 'added' };

/** A word-level diff (longest common subsequence over words and the spaces between them). */
export function diffWords(before: string, after: string): Part[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      const row = lcs[i] as number[];
      row[j] = a[i] === b[j] ? (lcs[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(lcs[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  const parts: Part[] = [];
  const push = (text: string, op: Part['op']) => {
    const last = parts.at(-1);
    if (last?.op === op) last.text += text;
    else parts.push({ text, op });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(a[i] ?? '', 'same');
      i += 1;
      j += 1;
    } else if ((lcs[i + 1]?.[j] ?? 0) >= (lcs[i]?.[j + 1] ?? 0)) {
      push(a[i] ?? '', 'removed');
      i += 1;
    } else {
      push(b[j] ?? '', 'added');
      j += 1;
    }
  }
  for (; i < a.length; i += 1) push(a[i] ?? '', 'removed');
  for (; j < b.length; j += 1) push(b[j] ?? '', 'added');
  return parts;
}

/** Removed and added text, marked with del/ins and named for screen readers (they don't announce del and ins). */
function Diff({ change }: { change: ProposedChange }) {
  if (change.kind === 'text') {
    return (
      <p className="review-changes__diff">
        {diffWords(change.before, change.after).map((part, index) =>
          part.op === 'same' ? (
            <span key={index}>{part.text}</span>
          ) : part.op === 'removed' ? (
            <del key={index}>
              <span className="visually-hidden">[removed: </span>
              {part.text}
              <span className="visually-hidden">]</span>
            </del>
          ) : (
            <ins key={index}>
              <span className="visually-hidden">[added: </span>
              {part.text}
              <span className="visually-hidden">]</span>
            </ins>
          ),
        )}
      </p>
    );
  }
  return (
    <p className="review-changes__diff">
      <del>
        <span className="visually-hidden">Was </span>
        {change.before}
      </del>
      <span aria-hidden="true"> → </span>
      <ins>
        <span className="visually-hidden">, will be </span>
        {change.after}
      </ins>
    </p>
  );
}

/**
 * Changes an AI proposes, reviewed before anything happens: each as a diff (a field's before and
 * after, or a text rewrite word by word) with Accept and Reject, plus Accept all and Reject all.
 * Only accepted changes are applied, then each shows its outcome and Undo restores the previous
 * values. A change the person can't make says why instead of offering Accept.
 */
export function ReviewChanges({
  title,
  changes,
  decisions: controlled,
  defaultDecisions = {},
  onDecisionsChange,
  onApply,
  applying = false,
  outcomes,
  onUndo,
  undoing = false,
  undone = false,
  summary,
  UNSAFE_className,
  UNSAFE_style,
}: ReviewChangesProps) {
  const [own, setOwn] = useState<Record<string, ChangeDecision>>({ ...defaultDecisions });
  const decisions = controlled ?? own;
  const applied = outcomes !== undefined;
  const locked = applying || applied;
  const open = changes.filter((c) => c.blockedReason === undefined);
  const accepted = open.filter((c) => decisions[c.id] === 'accepted');
  const failed = Object.values(outcomes ?? {}).filter((o) => !o.ok).length;
  const succeeded = Object.values(outcomes ?? {}).filter((o) => o.ok).length;

  const decide = (next: Record<string, ChangeDecision>) => {
    if (controlled === undefined) setOwn(next);
    onDecisionsChange?.(next);
  };
  const setOne = (id: string, decision: ChangeDecision | undefined) => {
    const next = Object.fromEntries(Object.entries(decisions).filter(([key]) => key !== id));
    decide(decision ? { ...next, [id]: decision } : next);
  };
  const setAll = (decision: ChangeDecision) => decide(Object.fromEntries(open.map((c) => [c.id, decision])));

  return (
    <section className={cx('review-changes', UNSAFE_className)} style={UNSAFE_style} aria-label={title}>
      <div className="review-changes__header">
        <p className="review-changes__title">{title}</p>
        <AiMarker>Proposed by AI</AiMarker>
      </div>
      {summary}
      {!locked ? (
        <div className="review-changes__bulk">
          <span className="review-changes__count" role="status">
            {`${String(accepted.length)} of ${String(open.length)} accepted`}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setAll('accepted')}>
            Accept all
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAll('rejected')}>
            Reject all
          </Button>
        </div>
      ) : null}
      <ol className="review-changes__list">
        {changes.map((change) => {
          const decision = decisions[change.id];
          const outcome = outcomes?.[change.id];
          return (
            <li key={change.id} className="review-changes__item" data-decision={change.blockedReason ? 'blocked' : decision}>
              <div className="review-changes__item-header">
                <span className="review-changes__target">{change.target}</span>
                <span className="review-changes__field">{change.field}</span>
              </div>
              <Diff change={change} />
              {change.reason ? <p className="review-changes__reason">{change.reason}</p> : null}
              {change.blockedReason ? (
                <p className="review-changes__reason">{`Can’t apply: ${change.blockedReason}`}</p>
              ) : outcome ? (
                outcome.ok ? (
                  <Badge tone={undone ? 'neutral' : 'success'}>{undone ? 'Undone' : 'Applied'}</Badge>
                ) : (
                  <Badge tone="danger">{`Not applied: ${outcome.reason}`}</Badge>
                )
              ) : applied ? (
                <Badge tone="neutral">Rejected</Badge>
              ) : (
                <div className="review-changes__decide" role="group" aria-label={`${change.field} of ${change.target}`}>
                  <Toggle size="sm" label="Accept" pressed={decision === 'accepted'} disabled={locked} onPressedChange={(p) => setOne(change.id, p ? 'accepted' : undefined)} />
                  <Toggle size="sm" label="Reject" pressed={decision === 'rejected'} disabled={locked} onPressedChange={(p) => setOne(change.id, p ? 'rejected' : undefined)} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="review-changes__footer">
        {/* Present from mount, so the result is announced when it arrives. */}
        <span className="review-changes__count" role="status">
          {!applied
            ? ''
            : undone
              ? 'Undone. Everything is back as it was.'
              : failed > 0
                ? `${String(succeeded)} applied, ${String(failed)} not applied.`
                : `${String(succeeded)} applied.`}
        </span>
        {applied ? (
          onUndo && !undone && succeeded > 0 ? (
            <Button variant="secondary" loading={undoing} onClick={onUndo}>
              {undoing ? 'Undoing…' : 'Undo'}
            </Button>
          ) : null
        ) : (
          <Button loading={applying} disabled={accepted.length === 0} onClick={() => onApply(accepted.map((c) => c.id))}>
            {applying ? 'Applying…' : `Apply ${String(accepted.length)} accepted`}
          </Button>
        )}
      </div>
    </section>
  );
}
