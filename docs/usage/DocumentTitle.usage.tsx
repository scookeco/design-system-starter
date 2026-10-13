import { DocumentTitle, Document, DocumentViewer, Recital, Recitals, Term, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentTitle, Recitals, Recital],
  whenToUse: [
    'The top of a generated agreement: `DocumentTitle` for its title and number (centred) and the preamble that names the parties, with each defined term in a `Term define`.',
    '`Recitals` for the background before the operative clauses: each `Recital` is written without its “WHEREAS,” (it is added), and `closing` follows “NOW, THEREFORE,”.',
  ],
  whenNotToUse: [
    { situation: 'The page’s own title in an app (the record, the list)', instead: '`PageHeader`' },
    { situation: 'A heading inside the agreement', instead: '`Clause` with a `title`' },
  ],
  do: {
    caption: 'Title, number and preamble, then the recitals: the same structure for every agreement the app generates.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <DocumentTitle title="Master Services Agreement" number="Agreement No. MSA-2026-0142">
            This Agreement is between Acme Corp (<Term>Provider</Term>) and Globex Inc. (<Term>Customer</Term>).
          </DocumentTitle>
          <Recitals whereas closing="in consideration of the mutual covenants set out below, the Parties agree as follows:">
            <Recital>Provider operates a facilities management platform;</Recital>
          </Recitals>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A title set as body text and recitals typed with their own “WHEREAS”: inconsistent from one generated document to the next.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>MASTER SERVICES AGREEMENT</Text>
          <Text>Whereas Provider operates a platform…</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'The title is a heading one level above the document’s clauses (an h1 with the default `headingLevel` of 2). Inside AppShell, where `PageHeader` owns the h1, give the `Document` `headingLevel={3}` so the title is an h2.',
    'The title block is a `header`; recitals are plain paragraphs in reading order.',
  ],
};
