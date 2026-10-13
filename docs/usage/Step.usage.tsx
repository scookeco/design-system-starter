import { Document, DocumentGrid, DocumentPage, DocumentViewer, Step, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Step],
  whenToUse: [
    'The numbered steps of a form (“Step 2: Multiple jobs or spouse works”). Steps number themselves; `n` fixes one where the form prints it, so Step 5 stays 5 when Steps 3 and 4 are skipped. `optional` adds “(optional)”.',
    'On a grid page, place it with `area`; its fields can sit beside it on the grid or inside it.',
  ],
  whenNotToUse: [
    { situation: 'The steps of a task in the app (a wizard)', instead: '`Stepper` in `FocusedLayout`' },
    { situation: 'A clause of an agreement', instead: '`Clause`' },
    { situation: 'Sub-steps inside a step', instead: 'a fieldset: steps are flat' },
  ],
  do: {
    caption: 'Steps placed on the form page, each numbered by the document.',
    render: () => (
      <DocumentViewer>
        <Document label="Employee's withholding certificate" shell="grid" headingLevel={3}>
          <DocumentPage>
            <DocumentGrid cols={12}>
              <Step title="Enter personal information" area={{ row: 1, column: 1, columnSpan: 12 }} />
              <Step title="Multiple jobs or spouse works" optional area={{ row: 3, column: 1, columnSpan: 12 }} />
            </DocumentGrid>
          </DocumentPage>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: '“Step 2” typed into text: hide a step and the numbers after it are wrong.',
    render: () => (
      <DocumentViewer>
        <Document label="Form">
          <Text>Step 2: Multiple jobs or spouse works</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `section` named by its heading (“Step 2: Multiple jobs or spouse works (optional)”); the number is generated content and is read with the heading.', 'On a grid page, reading order is source order: write steps and their fields in the order a person fills them.'],
};
