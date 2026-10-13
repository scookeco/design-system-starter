import { Document, DocumentField, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentField],
  whenToUse: [
    'Every value a document captures or merges, bound to a data key (`name`): text, number, currency (stored in integer minor units), date, duration, email, phone, ssn, ein, textarea. The `Document`’s values hold it.',
    'How it shows follows the `Document`’s lifecycle: an input while filled or negotiated; formatted text when generated or executed, an empty one a blank line (or its `placeholder`, filling in place with `announceAs`). `showLabel` puts the label above it, as a form’s box.',
    '`role` names the party who fills it; a `DocumentFieldset` (or a role region) gives one to every field inside it.',
  ],
  whenNotToUse: [
    { situation: 'A form in the app, not a document', instead: '`TextField`, `NumberField`, `DatePicker` in a form' },
    { situation: 'A value derived from others', instead: '`Computed`' },
    { situation: 'A yes/no, a choice, a file', instead: '`DocumentCheckbox`, `DocumentRadioGroup` or `DocumentSelect`, `DocumentAttachment`' },
  ],
  do: {
    caption: 'Values by name: the same markup is a merged document or a form to fill.',
    render: () => (
      <DocumentViewer>
        <Document label="Order form" values={{ customer: 'Globex Inc.', fee: 1250000 }}>
          <Text>
            <DocumentField name="customer" label="Customer" /> pays <DocumentField name="fee" label="Annual fee" type="currency" /> a year.
          </Text>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A value typed into the text: it can’t be exported, filled or checked, and every copy of the template needs editing.',
    render: () => (
      <DocumentViewer>
        <Document label="Order form">
          <Text>Globex Inc. pays $12,500.00 a year.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'Every input has a label (`label`): shown above it with `showLabel`, or named for assistive technology when it is a blank in a sentence.',
    'Native constraints: `required`, a pattern for ssn and ein, numeric keyboards for numbers and money. Inside a Conditional that is off it is disabled and not required.',
    'A placeholder is a highlight, never part of a selection; one that fills is announced once in the viewer’s live region.',
  ],
};
