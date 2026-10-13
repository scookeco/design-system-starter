import { Children, type ReactNode } from 'react';
import { VisuallyHidden } from '../../primitives/VisuallyHidden/VisuallyHidden';
import { Button } from '../Button/Button';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { RowContext } from '../Document/data';
import { useRows } from '../Repeat/Repeat';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../Table/Table';
import './LineItems.css';

export interface LineItemsColumn {
  /** The column's heading ("Qty", "Unit price"). Required. */
  label: string;
  /** Numbers and amounts: aligned at the end, in tabular figures. */
  numeric?: boolean;
}

export interface LineItemsProps {
  /** The data key: the rows ("items"). Required. */
  name: string;
  /** The table's name ("Line items"). Required. */
  caption: string;
  /** One per cell of the row template, in order. Required. */
  columns: readonly LineItemsColumn[];
  /** Rows shown even when empty. Default 1. */
  min?: number;
  /** Most rows. Default 50. */
  max?: number;
  /** The add button's label. Default "Add line". */
  addLabel?: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** The row template: one field or Computed per column ("description", "qty", "unit_price", then the amount). Required. */
  children: ReactNode;
}

/**
 * An invoice's or a quote's lines: a table that repeats a row template (a Repeat as a table), with
 * a Computed amount per line that totals can sum (`sum(items.amount)`).
 */
export function LineItems({ name, caption, columns, min = 1, max = 50, addLabel = 'Add line', area, children }: LineItemsProps) {
  const rows = useRows(name, min, max);
  const cells = Children.toArray(children);
  return (
    <div className="line-items" data-doc="line-items" data-name={rows.path} data-min={String(min)} data-max={String(max)} style={areaStyle(area)}>
      <Table caption={caption} hideCaption>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableHeaderCell key={column.label} numeric={column.numeric}>
                {column.label}
              </TableHeaderCell>
            ))}
            {rows.canRemove ? (
              <TableHeaderCell>
                <VisuallyHidden>Remove</VisuallyHidden>
              </TableHeaderCell>
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows.count }, (_, index) => (
            <TableRow key={index}>
              <RowContext value={{ repeat: rows.path, index }}>
                {cells.map((cell, i) => (
                  <TableCell key={columns[i]?.label ?? i} numeric={columns[i]?.numeric}>
                    {cell}
                  </TableCell>
                ))}
              </RowContext>
              {rows.canRemove ? (
                <TableCell>
                  <span className="line-items__actions">
                    <Button variant="ghost" size="sm" onClick={() => rows.remove(index)}>
                      Remove<VisuallyHidden> line {index + 1}</VisuallyHidden>
                    </Button>
                  </span>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.canAdd ? (
        <span className="line-items__actions">
          <Button variant="secondary" size="sm" onClick={rows.add}>
            {addLabel}
          </Button>
        </span>
      ) : null}
    </div>
  );
}
