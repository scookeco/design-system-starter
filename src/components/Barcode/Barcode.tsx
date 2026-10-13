import { useEffect, useMemo } from 'react';
import { areaStyle, type DocumentArea } from '../Document/Document';
import { encodeQr } from './qr';
import './Barcode.css';

/** The barcode kinds drawn. QR only for now; 1D symbologies (Code 128) when a document needs one. */
export type BarcodeSymbology = 'qr';

export interface BarcodeProps {
  /** What it encodes (a document id, a verification URL), up to 213 bytes. Required. */
  value: string;
  /** Default qr. */
  symbology?: BarcodeSymbology;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/** The quiet zone a reader needs around the symbol, in modules. */
const QUIET = 4;

/**
 * A QR code for a document's id or a verification link, drawn as SVG from the system's own encoder
 * (no dependency), so it prints sharp. Always dark on light, whatever the theme, so it scans.
 */
export function Barcode({ value, symbology = 'qr', area }: BarcodeProps) {
  const result = useMemo(() => {
    try {
      return { modules: encodeQr(value), error: null };
    } catch (e) {
      return { modules: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [value]);
  useEffect(() => {
    if (result.error) console.error(`Barcode: ${result.error}`);
  }, [result.error]);
  if (!result.modules) return null;
  const size = result.modules.length + QUIET * 2;
  const path = result.modules
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${String(x + QUIET)} ${String(y + QUIET)}h1v1h-1z` : '')))
    .join('');
  return (
    <svg
      className="barcode"
      data-doc="barcode"
      data-symbology={symbology}
      data-value={value}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code: ${value}`}
      style={areaStyle(area)}
    >
      <rect className="barcode__ground" width={size} height={size} />
      <path className="barcode__modules" d={path} />
    </svg>
  );
}
