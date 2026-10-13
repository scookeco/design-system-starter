import { Document, DocumentField, DocumentFieldset, DocumentViewer } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentFieldset],
  whenToUse: ['Related fields named together (“Employer”, an address): a `legend` over them. `role` gives every field inside to one party unless a field says otherwise.'],
  whenNotToUse: [
    { situation: 'A numbered step of a form', instead: '`Step` (with a fieldset inside if it groups fields)' },
    { situation: 'A whole part of the document for one party, not just fields', instead: 'a role region' },
  ],
  do: {
    caption: 'The employer’s fields grouped and assigned once.',
    render: () => (
      <DocumentViewer>
        <Document label="Form" lifecycle="filled">
          <DocumentFieldset legend="Employers only" role="employer">
            <DocumentField name="ein" label="EIN" type="ein" showLabel />
          </DocumentFieldset>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'The same role repeated on every field: one missed field goes to the wrong party.',
    render: () => (
      <DocumentViewer>
        <Document label="Form" lifecycle="filled">
          <DocumentField name="ein" label="EIN" type="ein" showLabel role="employer" />
          <DocumentField name="employer_name" label="Employer" showLabel />
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A native `fieldset` named by its `legend`, so each field inside is announced with it.'],
};
