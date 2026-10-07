import { Clause, ClauseRef, DocumentViewer, Term, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Clause, ClauseRef, Term],
  whenToUse: [
    'The numbered body of a generated agreement in a DocumentViewer: one `Clause` per section, nested for sub-clauses. Numbers (1., 1.1, (a), (i)) come from position, so optional clauses and reordering never leave a gap or a stale number.',
    '`ClauseRef` wherever the text points at another clause (“subject to Section 3.2(a)”): it names the clause by id and always shows its current number.',
    '`Term define` once where a defined term is defined, `Term` wherever it is used; `name` for a plural or possessive. Undefined or twice-defined terms are marked.',
  ],
  whenNotToUse: [
    { situation: 'A reference to another document (“MSA §6” from a DPA)', instead: 'plain text naming that document: references resolve within one DocumentViewer only' },
    { situation: 'Headings in an app page or a long help article', instead: '`Heading` (and a table of contents built from it)' },
    { situation: 'A list of options or steps', instead: 'a list in `Text`, or `Steps`' },
  ],
  do: {
    caption: 'Clauses by id, references by id: remove or move a clause and every number follows.',
    render: () => (
      <DocumentViewer label="Agreement">
        <Clause id="fees" title="Fees">
          <Text>
            The <Term define>Fees</Term> are due within thirty (30) days, except as in <ClauseRef to="disputes" />.
          </Text>
        </Clause>
        <Clause id="disputes" title="Disputed amounts">
          <Text>
            <Term>Fees</Term> disputed in good faith may be withheld.
          </Text>
        </Clause>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Numbers typed into headings and text: the first clause added or removed leaves them wrong.',
    render: () => (
      <DocumentViewer label="Agreement">
        <Text>1. Fees. The Fees are due within thirty (30) days, except as in Section 2.</Text>
        <Text>2. Disputed amounts. Fees disputed in good faith may be withheld.</Text>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'A titled clause is a `section` named by its heading, and the heading holds the number, so the outline reads “3.1 Invoices”. Heading levels start at the viewer’s `headingLevel` (2 by default, under the page’s h1) and go one deeper per nesting.',
    'A `ClauseRef` is a link named with the full reference (“Section 3.2(a)”); following it moves focus to the clause, which scrolls clear of sticky content (scroll padding).',
    'Unresolved references and terms are marked with a wavy underline in the danger colour and keep their text (“Section [pricing?]”), so the problem is not shown by colour alone; each is also reported in the console.',
    'A defined term is a `dfn`, in quotes and bold, so it is announced and seen as the definition.',
  ],
};
