import { Document, DocumentField, DocumentViewer, Repeat, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Repeat],
  whenToUse: [
    'The same block once per row: employment history, checklist items, dependants. The rows are a list under `name`; fields inside are named for one row. `min` rows always show (blank ones print), and people add rows up to `max`.',
    'An invoice’s lines are `LineItems`: a Repeat as a table.',
  ],
  whenNotToUse: [
    { situation: 'Rows of data the app generated', instead: '`Table`' },
    { situation: 'A Repeat inside a Repeat', instead: 'flatten the rows: rows don’t nest' },
  ],
  do: {
    caption: 'One row template; the rows are data.',
    render: () => (
      <DocumentViewer>
        <Document label="Application" lifecycle="filled">
          <Repeat name="references" min={1} max={3} addLabel="Add reference">
            <DocumentField name="name" label="Reference’s name" showLabel />
          </Repeat>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Three copies of the same fields: a fourth reference doesn’t fit, and the data comes out as reference1, reference2…',
    render: () => (
      <DocumentViewer>
        <Document label="Application" lifecycle="filled">
          <DocumentField name="reference1" label="Reference 1" showLabel />
          <Text>…</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['Add and Remove are Buttons; each Remove is named with its row (“Remove row 2”). Neither prints.'],
};
