import { Clause, Xref, Document, DocumentViewer, Term, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Clause, Term],
  whenToUse: [
    'The numbered body of an agreement in a `Document`: one `Clause` per section, nested for sub-clauses. Numbers (1., 1.1, (a), (i)) are CSS counters drawn from position, never typed, so optional clauses and reordering never leave a gap or a stale number. `numbered={false}` for a clause that takes none.',
    'Point at a clause with `Xref` (“subject to Section 3.2(a)”): it names the clause by id and always shows its current number.',
    '`Term` where running text defines a term (a party in the preamble: Acme Corp (“Vendor”)); everywhere else the term is an `Xref` to it. A list of definitions is `Definitions`.',
  ],
  whenNotToUse: [
    { situation: 'A reference to another document (“MSA §6” from a DPA)', instead: 'plain text naming that document: references resolve within one DocumentViewer only' },
    { situation: 'Headings in an app page or a long help article', instead: '`Heading` (and a table of contents built from it)' },
    { situation: 'A list of options or steps', instead: 'a list in `Text`, or `Steps`' },
  ],
  do: {
    caption: 'Clauses by id, references by id: remove or move a clause and every number follows.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="fees" title="Fees">
            <Text>
              The <Term>Fees</Term> are due within thirty (30) days, except as in <Xref to="disputes" />.
            </Text>
          </Clause>
          <Clause id="disputes" title="Disputed amounts">
            <Text>
              <Xref to="def-fees" /> disputed in good faith may be withheld.
            </Text>
          </Clause>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Numbers typed into headings and text: the first clause added or removed leaves them wrong.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>1. Fees. The Fees are due within thirty (30) days, except as in Section 2.</Text>
          <Text>2. Disputed amounts. Fees disputed in good faith may be withheld.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'A titled clause is a `section` named by its heading, and the heading holds the number, so the outline reads “3.1 Invoices”. Heading levels start at the Document’s `headingLevel` (2 by default, under the page’s h1) and go one deeper per nesting.',
    'The number is generated content: screen readers read it with the heading (“3.1 Invoices”), but it is not in copied text or the browser’s find. Every clause is a `section`.',
    'A clause id used twice and a term defined twice are marked with a wavy underline in the danger colour, so the problem is not shown by colour alone; each is also reported in the console.',
    'A defined term is a `dfn`, in quotes and bold, so it is announced and seen as the definition.',
  ],
};
