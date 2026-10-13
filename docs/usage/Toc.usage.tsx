import { Clause, Document, DocumentViewer, Text, Toc } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Toc],
  whenToUse: [
    'A table of contents for a long `Document` (an MSA, a handbook), generated from its clauses, sections and exhibits as they are now: numbers and titles follow every edit. `depth` sets how many clause levels it lists (2 by default).',
  ],
  whenNotToUse: [
    { situation: 'Navigation between pages of the app', instead: '`Nav` or `NavTabs`' },
    { situation: 'A short document of a few clauses', instead: 'nothing: the headings are enough' },
  ],
  do: {
    caption: 'Generated from the clauses: remove one and the contents renumber with it.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Toc />
          <Clause id="fees" title="Fees">
            <Text>Net 30.</Text>
          </Clause>
          <Clause id="term" title="Term">
            <Text>Two years.</Text>
          </Clause>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A contents list typed by hand: it drifts from the clauses the first time one moves.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>Contents: 1. Fees · 2. Term</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `nav` landmark named “Contents” (or `label`) holding nested ordered lists; each entry is a link that moves focus to its clause.'],
};
