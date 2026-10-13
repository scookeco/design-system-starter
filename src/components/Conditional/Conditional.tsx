import { useContext, useEffect, type ReactNode } from 'react';
import { HiddenContext, RowContext, useDocumentData } from '../Document/data';
import { holds } from '../Document/expression';
import './Conditional.css';

export interface ConditionalProps {
  /** When it shows: an expression over the document's values ("multiple_jobs == true", "lifecycle != 'executed'"). Required. */
  when: string;
  /** Any block: a field, a step, a clause, a table. Required. */
  children: ReactNode;
}

/**
 * Shows its content only while `when` holds, live as the document is filled in. While it is off,
 * its fields are disabled and not required, and its clauses take no number. In print every branch
 * shows (a blank form offers all of them) unless the Document's printMode is "resolved".
 */
export function Conditional({ when, children }: ConditionalProps) {
  const data = useDocumentData();
  const row = useContext(RowContext);
  const outer = useContext(HiddenContext);
  let shown = true;
  let error: string | null = null;
  try {
    shown = holds(when, (path) => data.lookup(path, row));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  useEffect(() => {
    if (error) console.error(`Conditional: ${error}`);
  }, [error]);
  return (
    <div className="conditional" data-doc="conditional" data-when={when} data-off={shown ? undefined : 'true'} data-print={data.printMode}>
      <HiddenContext value={outer || !shown}>{children}</HiddenContext>
    </div>
  );
}
