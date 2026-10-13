import { areaStyle, type DocumentArea } from '../Document/Document';
import './Seal.css';

export interface SealProps {
  /** Who issued it ("State of Washington"): names the seal. Required. */
  issuer: string;
  /** The seal's image. Required. */
  src: string;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/** An issuer's official seal or stamp on a certificate, a license or a notarised page, named by its issuer. */
export function Seal({ issuer, src, area }: SealProps) {
  return <img className="seal" data-doc="seal" data-issuer={issuer} src={src} alt={`Seal of ${issuer}`} style={areaStyle(area)} />;
}
