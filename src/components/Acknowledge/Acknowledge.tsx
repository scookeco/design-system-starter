import { areaStyle, type DocumentArea } from '../Document/Document';
import { DocumentCheckbox } from '../DocumentCheckbox/DocumentCheckbox';
import { DateSigned, Signature } from '../Signature/Signature';
import './Acknowledge.css';

export interface AcknowledgeProps {
  /** The party acknowledging (a role from Parties). Required. */
  role: string;
  /** What they acknowledge, as the box's label ("I have read and agree to the Employee Handbook"). Required. */
  text: string;
  /** Starts the app's adopt-signature flow, as Signature's onSign. */
  onSign?: () => void;
  /** Where it sits on a DocumentGrid. */
  area?: DocumentArea;
}

/**
 * The acknowledgement at the end of a policy or handbook: a required box to check, a signature and
 * the date signed, all for one party. The box is the document's `<role>_acknowledged` value.
 */
export function Acknowledge({ role, text, onSign, area }: AcknowledgeProps) {
  return (
    <fieldset className="acknowledge" data-doc="acknowledge" data-role={role} style={areaStyle(area)}>
      <legend className="acknowledge__legend">Acknowledgement</legend>
      <DocumentCheckbox name={`${role}_acknowledged`} label={text} role={role} required />
      <div className="acknowledge__signing">
        <Signature role={role} onSign={onSign} />
        <DateSigned role={role} />
      </div>
    </fieldset>
  );
}
