import { useContext, useEffect, useId, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { tokenStyle } from '../../internal/closed-api';
import { vars, type GapToken } from '../../tokens/tokens';
import type { HeadingLevel } from '../Heading/Heading';
import { DocumentScopeContext, useDocumentIndex, type DocumentLifecycle, type DocumentShell } from './documentIndex';
import './Document.css';

export type { DocumentLifecycle, DocumentShell };

export interface DocumentProps {
  /** The document's name: labels the document ("Master services agreement"). Required. */
  label: string;
  /** What kind of document it is, stable and lowercase-kebab ("msa", "w-4", "invoice"): the key workflows and exports use. */
  type?: string;
  /** The template's version ("3.2", "2026"). */
  version?: string;
  /** Where it is in its life: generated from data (the default), filled in, negotiated or executed. */
  lifecycle?: DocumentLifecycle;
  /** The document's language, when it differs from the page's ("fr"). */
  lang?: string;
  /** flow (the default): content reflows, and pages break only in print. grid: fixed DocumentPages that place content on a DocumentGrid. */
  shell?: DocumentShell;
  /** The outline level of a top-level Clause's heading; sub-clauses go one deeper. Default 2 (under the page's h1). */
  headingLevel?: Exclude<HeadingLevel, 1>;
  /** How a reference from an Exhibit names the body of the document: “Section 7 of the Agreement”. Default "the Agreement". */
  documentName?: string;
  /** The document: a DocumentFlow, DocumentPages, or clauses and paragraphs directly. */
  children: ReactNode;
}

/**
 * The root of a document: exactly one per document. It names the document, says how it is laid out
 * (`shell`) and where it is in its life (`lifecycle`), and numbers what it holds: Clauses, Exhibits
 * and their references resolve inside it. Show it on screen in a DocumentViewer; the same markup
 * prints, with pages from DocumentPage and the print stylesheet.
 */
export function Document({
  label,
  type,
  version,
  lifecycle = 'generated',
  lang,
  shell = 'flow',
  headingLevel = 2,
  documentName = 'the Agreement',
  children,
}: DocumentProps) {
  const outer = useContext(DocumentScopeContext);
  const root = useRef<HTMLElement>(null);
  const scope = useId();
  const index = useDocumentIndex(root);
  const value = useMemo(
    () => ({ scope, shell, lifecycle, headingLevel, documentName, index }),
    [scope, shell, lifecycle, headingLevel, documentName, index],
  );

  useEffect(() => {
    if (outer) console.error(`Document: "${label}" is inside another Document; a document has exactly one root.`);
  }, [outer, label]);

  return (
    <article
      ref={root}
      className="document"
      data-doc="document"
      data-type={type}
      data-version={version}
      data-lifecycle={lifecycle}
      data-shell={shell}
      lang={lang}
      aria-label={label}
    >
      <DocumentScopeContext value={value}>{children}</DocumentScopeContext>
    </article>
  );
}

/** A normal-flow run of content: it reflows, and in print breaks into pages wherever the text falls. */
export function DocumentFlow({ children }: { children: ReactNode }) {
  return (
    <div className="document-flow" data-doc="flow">
      {children}
    </div>
  );
}

export interface DocumentPageProps {
  /** The paper. Default letter. */
  size?: 'letter';
  /** Default portrait. */
  orientation?: 'portrait' | 'landscape';
  /** The page's number, when the document fixes it (a form's "Page 2"). */
  n?: number;
  /** What the page holds: a DocumentGrid in a grid document, or flowing content. */
  children: ReactNode;
}

/**
 * An explicit page. In a flow document it starts a new page in print and continues the sheet on
 * screen (a signature page, an exhibit that must start fresh). In a grid document it is the fixed
 * page itself, on screen too, because where things sit is part of the form.
 */
export function DocumentPage({ size = 'letter', orientation = 'portrait', n, children }: DocumentPageProps) {
  const doc = useContext(DocumentScopeContext);
  return (
    <section
      className="document-page"
      data-doc="page"
      data-size={size}
      data-orientation={orientation}
      data-n={n === undefined ? undefined : String(n)}
      data-shell={doc?.shell ?? 'flow'}
    >
      {children}
    </section>
  );
}

/** Where a child of a DocumentGrid sits: 1-based grid lines, as a form's boxes are numbered by row and column. */
export interface DocumentArea {
  row: number;
  column: number;
  /** Rows it spans. Default 1. */
  rowSpan?: number;
  /** Columns it spans. Default 1. */
  columnSpan?: number;
}

/** The inline grid-area for an `area` (grid lines are data, not design values, as Meter's percentage is). */
export const areaStyle = (area: DocumentArea | undefined): CSSProperties | undefined =>
  area
    ? { gridArea: `${String(area.row)} / ${String(area.column)} / span ${String(area.rowSpan ?? 1)} / span ${String(area.columnSpan ?? 1)}` }
    : undefined;

export interface DocumentGridProps {
  /** Columns. Default 12. */
  cols?: number;
  /** Rows, each size.document.grid-row tall. Default: as many as the content needs. */
  rows?: number;
  /** Space between cells. Default space.document.grid-gap. */
  gap?: GapToken;
  /** The page's content; document parts that take `area` sit where it says, the rest fill in order. */
  children: ReactNode;
}

/** The coordinate system of a form page: equal columns and fixed-height rows that children place themselves on with `area`. One per DocumentPage. */
export function DocumentGrid({ cols = 12, rows, gap, children }: DocumentGridProps) {
  // Counts of columns and rows are data, as Meter's percentage is; their sizes come from tokens.
  const style = {
    ...tokenStyle({ '--document-grid-gap': gap ? vars.space.gap[gap] : undefined }),
    gridTemplateColumns: `repeat(${String(cols)}, minmax(0, 1fr))`,
    gridTemplateRows: rows === undefined ? undefined : `repeat(${String(rows)}, ${vars.size.document['grid-row']})`,
  };
  return (
    <div className="document-grid" data-doc="grid" style={style}>
      {children}
    </div>
  );
}

export interface DocumentCellProps {
  /** Where it sits on the DocumentGrid. Required. */
  area: DocumentArea;
  /** What sits there: a heading, text, anything without an `area` of its own. */
  children: ReactNode;
}

/** Places anything on a DocumentGrid by row and column, for content that takes no `area` itself (a heading, a paragraph). */
export function DocumentCell({ area, children }: DocumentCellProps) {
  return (
    <div className="document-cell" data-doc="cell" style={areaStyle(area)}>
      {children}
    </div>
  );
}
