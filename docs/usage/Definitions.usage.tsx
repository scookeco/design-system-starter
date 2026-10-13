import { Clause, Definition, Definitions, Document, DocumentViewer, Text, Xref } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Definitions, Definition],
  whenToUse: [
    'An agreement’s or a policy’s defined terms, listed: one `Definition` per term, with what it means. References to a term are `Xref`s to its id (“def-services” by default), which read as the term and link here.',
    'Put it in a Definitions clause, or on its own before the clauses.',
  ],
  whenNotToUse: [
    { situation: 'A term defined in running text (a party in the preamble)', instead: '`Term`' },
    { situation: 'Label and value pairs (an invoice’s number and date)', instead: 'a key-value list' },
  ],
  do: {
    caption: 'Each term defined once, and used through Xref: rename the term and every use follows.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="definitions" title="Definitions">
            <Definitions>
              <Definition term="Services">The services described in each Order Form.</Definition>
              <Definition term="Effective Date">The date of the last signature below.</Definition>
            </Definitions>
          </Clause>
          <Clause id="term" title="Term">
            <Text>
              The <Xref to="def-services" /> start on the <Xref to="def-effective-date" />.
            </Text>
          </Clause>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Definitions as bold text in a paragraph: nothing counts them, and uses can’t link to them.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>“Services” means the services in each Order Form. “Effective Date” means the date of the last signature.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'A description list (`dl`): each term a `dt` holding a `dfn`, its meaning the `dd`, so the pairing is announced.',
    'A term defined twice is marked with a wavy underline in the danger colour and reported in the console.',
  ],
};
