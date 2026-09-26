/**
 * Conflicts, field by field. A versioned write that comes back 409 carries the record as the server
 * has it now ("theirs"). With the version the edit started from ("base") and the person's edit
 * ("mine"), a three-way comparison says, for each field:
 *
 *   only mine changed     keep mine: nobody else touched it
 *   only theirs changed   take theirs: the person didn't touch it
 *   both, to the same     nothing to decide
 *   both, differently     a real conflict: the person chooses (yours or theirs)
 *
 * With no real conflict the write is simply re-based on their version and sent again (the edit
 * mutation does that once, on its own). Only a field both sides changed differently reaches the UI.
 */
import type { RecordChanges } from '../api/records';
import type { RecordEntity } from '../api/schemas';
import { EDIT_FIELDS, type EditFieldId } from '../registries/recordFields';

export type ConflictSide = 'mine' | 'theirs';

export interface FieldComparison {
  field: EditFieldId;
  /** Who changed it since the base: one side, or both (differently). */
  changedBy: ConflictSide | 'both';
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const valueOf = (record: RecordEntity, field: EditFieldId) => EDIT_FIELDS.find((f) => f.id === field)?.get(record);

/** Every editable field that differs between the three versions, and who changed it. */
export function compareVersions(base: RecordEntity, mine: RecordEntity, theirs: RecordEntity): FieldComparison[] {
  return EDIT_FIELDS.flatMap(({ id }): FieldComparison[] => {
    const mineChanged = !same(valueOf(base, id), valueOf(mine, id));
    const theirsChanged = !same(valueOf(base, id), valueOf(theirs, id));
    if (mineChanged && theirsChanged) return same(valueOf(mine, id), valueOf(theirs, id)) ? [] : [{ field: id, changedBy: 'both' }];
    if (mineChanged) return [{ field: id, changedBy: 'mine' }];
    if (theirsChanged) return [{ field: id, changedBy: 'theirs' }];
    return [];
  });
}

/** The fields both sides changed differently: what the person has to decide. */
export const realConflicts = (comparisons: readonly FieldComparison[]) => comparisons.filter((c) => c.changedBy === 'both');

/** An edit, applied to a record (what "mine" looks like). */
export const applyChanges = (record: RecordEntity, changes: RecordChanges): RecordEntity => {
  const { amountMinor, tags, ...rest } = changes;
  return {
    ...record,
    ...rest,
    ...(amountMinor === undefined ? {} : { amount: { ...record.amount, minor: amountMinor } }),
    ...(tags === undefined ? {} : { tags: [...tags] }),
  };
};

/** The changes that turn `from` into `to`, for the editable fields only. */
export const changesBetween = (from: RecordEntity, to: RecordEntity, fields: readonly EditFieldId[] = EDIT_FIELDS.map((f) => f.id)): RecordChanges => {
  const changes: RecordChanges = {};
  for (const field of fields) {
    if (same(valueOf(from, field), valueOf(to, field))) continue;
    if (field === 'name') changes.name = to.name;
    else if (field === 'owner') changes.ownerId = to.ownerId;
    else if (field === 'account') changes.accountId = to.accountId;
    else changes.amountMinor = to.amount.minor;
  }
  return changes;
};

/**
 * What to send, re-based on their version, once every real conflict has a side: every field only I
 * changed, plus each conflicting field where I chose mine. Fields only they changed aren't sent, so
 * their change stands. "Keep mine (overwrite)" is every choice set to mine; "Take theirs" sends nothing.
 */
export const resolveConflict = (base: RecordEntity, mine: RecordEntity, theirs: RecordEntity, choices: Partial<Record<EditFieldId, ConflictSide>>): RecordChanges => {
  const keep = compareVersions(base, mine, theirs)
    .filter((c) => c.changedBy === 'mine' || (c.changedBy === 'both' && (choices[c.field] ?? 'mine') === 'mine'))
    .map((c) => c.field);
  return changesBetween(theirs, mine, keep);
};
