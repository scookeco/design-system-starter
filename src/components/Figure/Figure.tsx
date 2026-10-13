import type { ReactNode } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import './Figure.css';

export interface FigureProps {
  /** What the figure shows, in a sentence, under it. */
  caption?: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
  /** The image, diagram or chart (an SVG chart prints as it is). Required. */
  children: ReactNode;
}

/** An image, a diagram or a chart in a document, with its caption. */
export function Figure({ caption, area, children }: FigureProps) {
  return (
    <figure className="document-figure" data-doc="figure" style={areaStyle(area)}>
      {children}
      {caption ? <figcaption className="document-figure__caption">{caption}</figcaption> : null}
    </figure>
  );
}
