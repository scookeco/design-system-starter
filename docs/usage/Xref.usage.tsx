import { Clause, Document, DocumentViewer, Exhibit, Term, Text, Xref } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Xref],
  whenToUse: [
    'Every reference inside a `Document` to another part of it: a clause (“Section 3.2(a)”), an exhibit (“Exhibit A”), an unnumbered section (its title) or a defined term (the term). It names the target by id and shows what the target is now.',
    'Across an exhibit’s edge it says which document it means: “Section 2 of Exhibit B”, “Section 7 of the Agreement” (`documentName` on the `Document`). `prefix` changes the word before a number (“clause 4”).',
    'A defined term as the sentence needs it, plural or possessive: `<Xref to="def-customer">Customer’s</Xref>`.',
  ],
  whenNotToUse: [
    { situation: 'A reference to another document (“MSA §6” from a DPA)', instead: 'plain text naming that document: references resolve within one Document' },
    { situation: 'A link to another page of the app', instead: '`Link`' },
  ],
  do: {
    caption: 'References by id: move or remove what they point at and every one follows.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="fees" title="Fees">
            <Text>
              <Term>Customer</Term> pays the fees, except as in <Xref to="disputes" /> and <Xref to="dpa" />.
            </Text>
          </Clause>
          <Clause id="disputes" title="Disputed amounts">
            <Text>
              <Xref to="def-customer">Customer’s</Xref> disputed amounts may be withheld.
            </Text>
          </Clause>
          <Exhibit id="dpa" title="Data Processing Agreement">
            <Text>Processing terms.</Text>
          </Exhibit>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A typed “Section 2”: the first clause added before it makes it point at the wrong one.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>Fees are due, except as in Section 2.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'An `a` named with the full reference (“Section 3.2(a)”); following it moves focus to the target, which scrolls clear of sticky content (scroll padding). A no-break space keeps “Section” and its number on one line.',
    'A reference to a term reads as the term, without link colour, and shows it is a link on hover and focus.',
    'A reference with no target keeps its text (“Section [pricing?]”) with a wavy underline in the danger colour, so the problem is not shown by colour alone, and is reported in the console.',
  ],
};
