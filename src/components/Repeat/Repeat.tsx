import { useEffect, type ReactNode } from 'react';
import { VisuallyHidden } from '../../primitives/VisuallyHidden/VisuallyHidden';
import { Button } from '../Button/Button';
import { RowContext, useField } from '../Document/data';
import './Repeat.css';

/** A Repeat's rows: how many show (at least `min`), and adding and removing them while editable. */
export function useRows(name: string, min: number, max: number) {
  const { data, path, value, set, row } = useField(name);
  const rows = Array.isArray(value) ? (value as unknown[]) : [];
  const count = Math.max(min, rows.length);
  useEffect(() => {
    if (row) console.error(`Repeat: "${name}" is inside another Repeat's row; rows don't nest.`);
  }, [row, name]);
  return {
    path,
    count,
    editable: data.editable,
    canAdd: data.editable && count < max,
    canRemove: data.editable && count > min,
    add: () => set([...rows, ...Array.from({ length: count - rows.length }, () => ({})), {}]),
    remove: (index: number) => set(rows.filter((_, i) => i !== index)),
  };
}

export interface RepeatProps {
  /** The data key: a list of rows, each an object of the row's fields. Required. */
  name: string;
  /** Rows shown even when empty (a printed form's blank rows). Default 0. */
  min?: number;
  /** Most rows a person can add. Default 20. */
  max?: number;
  /** The add button's label. Default "Add". */
  addLabel?: string;
  /** The row: fields and computed values named for one row ("employer", not "employment_history.0.employer"). Required. */
  children: ReactNode;
}

/**
 * The same block once per row: employment history, checklist items, schedules. Each row's fields
 * read and write that row's values, and a Computed in it computes per row. While editable, people
 * add rows up to `max` and remove them down to `min`; in print, `min` blank rows show.
 */
export function Repeat({ name, min = 0, max = 20, addLabel = 'Add', children }: RepeatProps) {
  const rows = useRows(name, min, max);
  return (
    <div className="repeat" data-doc="repeat" data-name={rows.path} data-min={String(min)} data-max={String(max)}>
      {Array.from({ length: rows.count }, (_, index) => (
        <div key={index} className="repeat__row" data-row={String(index)}>
          <RowContext value={{ repeat: rows.path, index }}>{children}</RowContext>
          {rows.canRemove ? (
            <span className="repeat__actions">
              <Button variant="ghost" size="sm" onClick={() => rows.remove(index)}>
                Remove<VisuallyHidden> row {index + 1}</VisuallyHidden>
              </Button>
            </span>
          ) : null}
        </div>
      ))}
      {rows.canAdd ? (
        <span className="repeat__actions">
          <Button variant="secondary" size="sm" onClick={rows.add}>
            {addLabel}
          </Button>
        </span>
      ) : null}
    </div>
  );
}
