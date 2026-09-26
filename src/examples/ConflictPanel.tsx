/**
 * A write conflict, shown field by field (src/app/model/conflicts.ts): what you changed, what they
 * changed, and a choice only where both of you changed the same field differently. Composed from
 * system components; used by the edit form and by the record page's rename.
 *
 *   Keep mine (overwrite)   send my changes again, based on their version: mine win where we collided
 *   Take theirs             drop my changes and start again from their version
 *   Save these choices      (two or more collisions) mine or theirs, field by field
 *
 * Fields only they changed are never sent back, so "Keep mine" can't undo a change I didn't make.
 */
import { useState } from 'react';
import { Banner, Button, Card, CardBody, CardHeader, Cluster, SegmentedControl, Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text, useFormat } from '../index';
import type { RecordChanges } from '../app/api/records';
import type { RecordEntity } from '../app/api/schemas';
import { compareVersions, realConflicts, resolveConflict, type ConflictSide } from '../app/model/conflicts';
import { FieldDisplay } from '../app/registries/fields';
import { EDIT_FIELDS, type EditFieldId } from '../app/registries/recordFields';

export interface ConflictPanelProps {
  /** The version the edit started from. */
  base: RecordEntity;
  /** The edit, applied to the base. */
  mine: RecordEntity;
  /** The record as the server has it now (from the 409). */
  theirs: RecordEntity;
  /** Who made their change, by name, when known. */
  by?: string | undefined;
  /** Only these fields (a rename compares just the name). Default: every editable field. */
  fields?: readonly EditFieldId[];
  /** A resolution is being sent. */
  pending?: boolean;
  /** Send these changes, based on their version. */
  onResolve: (changes: RecordChanges) => void;
  onTakeTheirs: () => void;
}

const SIDES = [
  { value: 'mine', label: 'Yours' },
  { value: 'theirs', label: 'Theirs' },
];

export function ConflictPanel({ base, mine, theirs, by, fields, pending = false, onResolve, onTakeTheirs }: ConflictPanelProps) {
  const format = useFormat();
  const comparisons = compareVersions(base, mine, theirs).filter((c) => !fields || fields.includes(c.field));
  const collisions = realConflicts(comparisons);
  const [choices, setChoices] = useState<Partial<Record<EditFieldId, ConflictSide>>>({});

  const keepMine = () => onResolve(resolveConflict(base, mine, theirs, {}));
  const saveChoices = () => onResolve(resolveConflict(base, mine, theirs, choices));

  return (
    <Stack gap="sm">
      <Banner tone="warning" title="Someone else changed this record">
        {`${by ? `${by} saved` : 'Someone saved'} a newer version while you were editing. Nothing was overwritten: choose what to keep.`}
      </Banner>
      <Card>
        <CardHeader title="Your changes and theirs" description="Where you both changed a field, choose which to keep. Everything else is merged." />
        <CardBody>
          <Table caption="Your changes and theirs" hideCaption>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Field</TableHeaderCell>
                <TableHeaderCell>Yours</TableHeaderCell>
                <TableHeaderCell>Theirs</TableHeaderCell>
                <TableHeaderCell>Keeps</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisons.map(({ field: id, changedBy }) => {
                const field = EDIT_FIELDS.find((f) => f.id === id) ?? EDIT_FIELDS[0];
                return (
                  <TableRow key={id}>
                    <TableCell rowHeader>{field.label}</TableCell>
                    <TableCell>
                      <FieldDisplay field={field} entity={mine} format={format} />
                    </TableCell>
                    <TableCell>
                      <FieldDisplay field={field} entity={theirs} format={format} />
                    </TableCell>
                    <TableCell>
                      {changedBy === 'both' && collisions.length > 1 ? (
                        <SegmentedControl
                          label={`Keep for ${field.label}`}
                          hideLabel
                          options={SIDES}
                          value={choices[id] ?? 'mine'}
                          onValueChange={(side) => setChoices((current) => ({ ...current, [id]: side as ConflictSide }))}
                        />
                      ) : (
                        <Text as="span" tone="muted">
                          {changedBy === 'both' ? 'You choose' : changedBy === 'mine' ? 'Yours (only you changed it)' : 'Theirs (only they changed it)'}
                        </Text>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Cluster gap="sm" justify="end">
            <Button variant="secondary" disabled={pending} onClick={onTakeTheirs}>
              Take theirs
            </Button>
            {collisions.length > 1 ? (
              <>
                <Button variant="secondary" disabled={pending} onClick={keepMine}>
                  Keep mine (overwrite)
                </Button>
                <Button loading={pending} onClick={saveChoices}>
                  Save these choices
                </Button>
              </>
            ) : (
              <Button loading={pending} onClick={keepMine}>
                Keep mine (overwrite)
              </Button>
            )}
          </Cluster>
        </CardBody>
      </Card>
    </Stack>
  );
}
