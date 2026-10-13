import { useContext, useId, type CSSProperties, type ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { DocumentScopeContext } from '../Document/documentIndex';
import { Heading, type HeadingLevel } from '../Heading/Heading';
import './Step.css';

export interface StepProps {
  /** What the person does in this step ("Enter personal information"). Required. */
  title: string;
  /** The step's number when the form fixes it (a W-4's Step 5 stays 5 when Steps 3 and 4 are skipped). Default: the next. */
  n?: number;
  /** The step can be skipped: “(optional)” follows the title. */
  optional?: boolean;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** The step's fields and instructions, if they sit inside it rather than beside it on the grid. */
  children?: ReactNode;
}

/**
 * A numbered step of a form (“Step 2: Multiple jobs or spouse works”), flat by design: group the
 * fields inside one with a fieldset. Numbers are a counter, so steps number themselves; `n` fixes
 * one where the form prints it.
 */
export function Step({ title, n, optional = false, area, children }: StepProps) {
  const doc = useContext(DocumentScopeContext);
  const headingId = useId();
  const level = Math.min(4, doc?.headingLevel ?? 2) as HeadingLevel;
  // A fixed number is data (the form's own), set on the counter the way Meter sets its width.
  const style: CSSProperties = { ...areaStyle(area), ...(n === undefined ? {} : { counterSet: `step ${String(n)}` }) };
  return (
    <section className="step" data-doc="step" data-n={n === undefined ? undefined : String(n)} data-optional={optional ? 'true' : undefined} aria-labelledby={headingId} style={style}>
      <Heading level={level} size={4} id={headingId}>
        <span className="step__number" />
        {title}
        {optional ? <span className="step__optional"> (optional)</span> : null}
      </Heading>
      {children}
    </section>
  );
}
