import { Document, DocumentCheckbox, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentCheckbox],
  whenToUse: ['A yes or no in a document, stored as true or false under `name`: “I hold more than one job”, a consent box. Its label sits beside the box.'],
  whenNotToUse: [
    { situation: 'One choice of several', instead: '`DocumentRadioGroup`' },
    { situation: 'A setting in the app', instead: '`Checkbox` or `Switch`' },
    { situation: 'An acknowledgement with a signature', instead: 'the acknowledge part of the roles layer' },
  ],
  do: {
    caption: 'A native box with its label beside it.',
    render: () => (
      <DocumentViewer>
        <Document label="Form" lifecycle="filled">
          <DocumentCheckbox name="consent" label="I consent to electronic delivery" />
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A typed box: it can’t be checked, and what it means isn’t captured.',
    render: () => (
      <DocumentViewer>
        <Document label="Form">
          <Text>[ ] I consent to electronic delivery</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A native checkbox inside its label, so the label is its name and clicking it checks the box. Not editable, it shows its state disabled.'],
};
