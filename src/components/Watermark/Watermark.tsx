import { useContext } from 'react';
import { RowContext, useDocumentData } from '../Document/data';
import { holds } from '../Document/expression';
import './Watermark.css';

export interface WatermarkProps {
  /** The word across the page ("DRAFT", "CONFIDENTIAL"). Default "DRAFT". */
  text?: string;
  /** When it shows: an expression over the document's values and `lifecycle`. Default "lifecycle != 'executed'". */
  when?: string;
}

/**
 * A word across the document (“DRAFT”), faint behind the text, on every printed page, while `when`
 * holds: by default until the document is executed. It is announced once, as an image named by its word.
 */
export function Watermark({ text = 'DRAFT', when = "lifecycle != 'executed'" }: WatermarkProps) {
  const data = useDocumentData();
  const row = useContext(RowContext);
  if (!holds(when, (path) => data.lookup(path, row))) return null;
  return (
    <div className="watermark" data-doc="watermark">
      <svg className="watermark__mark" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label={text}>
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" transform="rotate(-35 50 50)" textLength="90" lengthAdjust="spacingAndGlyphs">
          {text}
        </text>
      </svg>
    </div>
  );
}
