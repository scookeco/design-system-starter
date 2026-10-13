import { Clause, Document, DocumentSection, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentSection],
  whenToUse: [
    'A titled part of a `Document` that is not a contract clause: a handbook chapter, a policy’s scope, a letter’s enclosures. Its heading takes the next outline level; `Toc` lists it and an `Xref` names it by its title.',
    'Clauses inside it number as if it weren’t there. `numbered` makes it a numbered `Clause`.',
  ],
  whenNotToUse: [
    { situation: 'A numbered section of an agreement', instead: '`Clause`' },
    { situation: 'A step of a form', instead: '`Step`' },
    { situation: 'A section of an app page', instead: '`Heading` and the layout primitives' },
  ],
  do: {
    caption: 'A handbook chapter titled, not numbered, with its rules numbered inside it.',
    render: () => (
      <DocumentViewer>
        <Document label="Employee handbook">
          <DocumentSection id="leave" title="Leave and time off">
            <Clause id="vacation" title="Vacation">
              <Text>Twenty days a year.</Text>
            </Clause>
          </DocumentSection>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A section made from bold text: it is not in the outline, the table of contents or any reference.',
    render: () => (
      <DocumentViewer>
        <Document label="Employee handbook">
          <Text>
            <strong>Leave and time off</strong>
          </Text>
          <Text>Twenty days a year.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `section` named by its heading, at the next level of the document’s outline; a reference to it moves focus there.'],
};
