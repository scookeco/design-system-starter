/**
 * The list page's board: the same rows as the table (one query, one projection), grouped into
 * columns by the per-status predicates (toBoard). Example code, not a system component: it composes
 * Grid, Stack, Card, Badge and Menu, and a second board would be the moment to promote it.
 *
 * Keyboard first. Every card is a list item with a link and a "Move to…" menu, so moving a record
 * never needs a pointer. Dragging a card onto a column does the same thing for people who prefer
 * it; the menu is its declared single-pointer alternative (WCAG 2.2 SC 2.5.7).
 *
 * Anatomy:
 *   column   h2 (status) · the server's count for that status · a list of cards, or "None on this page"
 *   card     name (link) · status and legal-hold badges · owner · account · amount · Move to…
 */
import { useId, type DragEvent, type ReactNode } from 'react';
import { Badge, Button, Card, CardBody, Cluster, Grid, Heading, Link, Menu, Stack, Text, useFormat } from '../index';
import { MOVABLE_STATUSES, type MovableStatus, type StatusCounts } from '../app/api/schemas';
import type { BoardColumn, RecordRow } from '../app/model/projections';
import { STATUS } from '../app/model/status';
import { AccountRef, PersonRef } from '../app/registries/refs';

const DRAG_TYPE = 'application/x-record-id';
const isMovable = (status: string): status is MovableStatus => (MOVABLE_STATUSES as readonly string[]).includes(status);

export interface RecordBoardProps {
  columns: readonly BoardColumn[];
  /** Per-status totals from the server (the column's whole status, not just this page). */
  statusCounts: StatusCounts | undefined;
  /** Whether this person may move records at all (a capability); each row adds its own rule. */
  allowMove: boolean;
  /** The record being moved right now, if any. */
  movingId: string | undefined;
  onMove: (row: RecordRow, status: MovableStatus) => void;
  /** A card's link was followed (scroll and focus restoration remember it). */
  onOpen?: (link: HTMLAnchorElement) => void;
}

export function RecordBoard({ columns, statusCounts, allowMove, movingId, onMove, onOpen }: RecordBoardProps) {
  const format = useFormat();
  const rows = new Map(columns.flatMap((column) => column.rows.map((row) => [row.id, row] as const)));

  const drop = (status: string) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const row = rows.get(event.dataTransfer.getData(DRAG_TYPE));
    if (row && isMovable(status) && row.statusKey !== status) onMove(row, status);
  };

  return (
    <Grid min="sm" gap="md">
      {columns.map((column) => (
        <BoardColumnView
          key={column.status}
          column={column}
          total={statusCounts?.[column.status]}
          accepting={allowMove && isMovable(column.status)}
          onDropRecord={drop(column.status)}
          renderCard={(row) => (
            <RecordCard
              row={row}
              format={format}
              allowMove={allowMove}
              moving={movingId === row.id}
              targets={MOVABLE_STATUSES.filter((s) => s !== row.statusKey)}
              onMove={(status) => onMove(row, status)}
              onOpen={onOpen}
            />
          )}
        />
      ))}
    </Grid>
  );
}

interface ColumnProps {
  column: BoardColumn;
  total: number | undefined;
  accepting: boolean;
  onDropRecord: (event: DragEvent<HTMLElement>) => void;
  renderCard: (row: RecordRow) => ReactNode;
}

function BoardColumnView({ column, total, accepting, onDropRecord, renderCard }: ColumnProps) {
  const headingId = useId();
  const format = useFormat();
  return (
    <Stack
      as="section"
      gap="sm"
      aria-labelledby={headingId}
      // A drop zone only for people who can move; everyone else gets a plain column.
      {...(accepting ? { onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(), onDrop: onDropRecord } : {})}
      data-drag-alternative="The Move to… menu on each card"
    >
      <Cluster justify="between" align="center">
        <Heading level={2} size={4} id={headingId}>
          {column.label}
        </Heading>
        <Text as="span" size="caption" tone="muted" numeric>
          {total === undefined ? '' : `${format.number(total)} total`}
        </Text>
      </Cluster>
      {column.rows.length === 0 ? (
        <Text size="caption" tone="muted">
          None on this page
        </Text>
      ) : (
        <Stack as="ul" role="list" gap="sm">
          {column.rows.map((row) => (
            <li key={row.id}>{renderCard(row)}</li>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

interface CardProps {
  row: RecordRow;
  format: ReturnType<typeof useFormat>;
  allowMove: boolean;
  moving: boolean;
  targets: readonly MovableStatus[];
  onMove: (status: MovableStatus) => void;
  onOpen: ((link: HTMLAnchorElement) => void) | undefined;
}

function RecordCard({ row, format, allowMove, moving, targets, onMove, onOpen }: CardProps) {
  const canMoveThis = allowMove && row.movable && targets.length > 0;
  return (
    <Stack
      gap="2xs"
      {...(canMoveThis
        ? {
            draggable: true,
            onDragStart: (event: DragEvent<HTMLElement>) => {
              event.dataTransfer.setData(DRAG_TYPE, row.id);
              event.dataTransfer.effectAllowed = 'move';
            },
          }
        : {})}
      data-drag-alternative="This card's Move to… menu"
    >
      <Card>
        <CardBody>
          <Stack gap="xs">
            <Link href={`/records/${row.id}`} onClick={(event) => onOpen?.(event.currentTarget)}>
              {row.name}
            </Link>
            <Cluster gap="2xs">
              <Badge tone={row.status.tone}>{row.status.label}</Badge>
              {row.legalHold ? <Badge tone="warning">Legal hold</Badge> : null}
            </Cluster>
            <Text size="caption" tone="muted">
              <PersonRef id={row.ownerId} plain />
            </Text>
            <Text size="caption">
              <AccountRef id={row.accountId} />
            </Text>
            <Cluster justify="between" align="center">
              <Text numeric>{format.money(row.amount.minor, row.amount.currency)}</Text>
              {canMoveThis ? (
                <Menu
                  align="end"
                  trigger={
                    <Button variant="ghost" size="sm" loading={moving} aria-label={`${moving ? 'Moving…' : 'Move to…'}, ${row.name}`}>
                      {moving ? 'Moving…' : 'Move to…'}
                    </Button>
                  }
                  items={targets.map((status) => ({ label: `Move to ${STATUS[status].label}`, onSelect: () => onMove(status) }))}
                />
              ) : null}
            </Cluster>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
