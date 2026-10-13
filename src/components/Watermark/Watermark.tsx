import { useContext } from 'react';
import { DocumentScopeContext } from '../Document/documentIndex';
import './Watermark.css';

export interface WatermarkProps {
  /** The word across the page ("DRAFT", "CONFIDENTIAL"). Default "DRAFT". */
  text?: string;
  /** Show it. Default: until the document is executed (`lifecycle` other than "executed"). */
  show?: boolean;
}

/**
 * A word across the document (“DRAFT”), faint behind the text, on every printed page. By default it
 * shows until the document is executed. It is announced once, as an image named by its word.
 */
export function Watermark({ text = 'DRAFT', show }: WatermarkProps) {
  const doc = useContext(DocumentScopeContext);
  if (!(show ?? doc?.lifecycle !== 'executed')) return null;
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
