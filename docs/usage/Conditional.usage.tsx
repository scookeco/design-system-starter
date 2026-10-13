import { Conditional, Document, DocumentCheckbox, DocumentField, DocumentViewer } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Conditional],
  whenToUse: [
    'A block that applies only sometimes: an optional step, a clause for one jurisdiction, a field that follows an answer. `when` is an expression over the document’s values (and `lifecycle`): “multiple_jobs == true”, “state == \'CA\' and employees > 50”.',
    'While it is off, its fields are disabled and not required and its clauses take no number. In print every branch shows unless the `Document`’s `printMode` is "resolved".',
  ],
  whenNotToUse: [
    { situation: 'Showing or hiding app UI', instead: 'ordinary rendering in the page' },
    { situation: 'Two versions of one sentence', instead: 'a `DocumentSelect` or a value merged from data' },
  ],
  do: {
    caption: 'One block, shown by the answer it depends on.',
    render: () => (
      <DocumentViewer>
        <Document label="Form" lifecycle="filled" defaultValues={{ multiple_jobs: true }}>
          <DocumentCheckbox name="multiple_jobs" label="I hold more than one job" />
          <Conditional when="multiple_jobs == true">
            <DocumentField name="other_jobs" label="Pay from other jobs" type="currency" showLabel />
          </Conditional>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A field that is always there and always required: people who don’t need it can’t submit.',
    render: () => (
      <DocumentViewer>
        <Document label="Form" lifecycle="filled">
          <DocumentField name="other_jobs" label="Pay from other jobs (if any)" type="currency" showLabel required />
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['An off block is not displayed, so it isn’t read or reachable; what controls it (the checkbox) comes before it in the reading order.'],
};
