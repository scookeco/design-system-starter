import { Clause, Document, DocumentCell, DocumentFlow, DocumentGrid, DocumentPage, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Document, DocumentFlow, DocumentPage, DocumentGrid, DocumentCell],
  whenToUse: [
    'The root of every generated document: exactly one `Document` per document, named by `label`, with its `type` ("msa", "w-4"), `version` and `lifecycle` (generated, filled, negotiated, executed). Clauses, exhibits and references number and resolve inside it.',
    'Pick the shell: `flow` (the default) for contracts, letters and policies, which reflow and break into pages only in print; `grid` for forms whose layout is the content (a W-4), shown as fixed `DocumentPage`s with a `DocumentGrid` on each.',
    '`DocumentPage` in a flow document starts a new printed page (a signature page) and continues the sheet on screen. `DocumentFlow` holds a run of reflowing content.',
    'On a `DocumentGrid`, document parts take `area` ({ row, column, rowSpan, columnSpan }); `DocumentCell` places anything else (a heading, a paragraph).',
    'One source, five render targets: the screen (`DocumentViewer`), a fillable form (`lifecycle` filled, `onSubmit`), print/PDF (`npm run document:print -- <story-id>`), an eSignature envelope’s recipients and tabs (`npm run document:envelope`), and a data export (`exportDocument`, or `npm run document:export`). `validateDocument` checks one root, references, roles and areas; `expressionProblems` checks every `when` and `formula`.',
  ],
  whenNotToUse: [
    { situation: 'Showing a document on screen with highlights and the selection menu', instead: '`DocumentViewer` around the `Document`' },
    { situation: 'A scanned form or an image of one', instead: 'an image or PDF preview: only documents authored from structured source are in scope' },
    { situation: 'A grid to lay out an app page', instead: 'the `Grid` or `Switcher` primitive' },
  ],
  do: {
    caption: 'One Document root, its type and lifecycle declared, in a viewer on screen.',
    render: () => (
      <DocumentViewer>
        <Document label="Master services agreement" type="msa" lifecycle="negotiated">
          <DocumentFlow>
            <Clause id="term" title="Term">
              <Text>Twenty-four (24) months from the Effective Date.</Text>
            </Clause>
          </DocumentFlow>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Clauses straight in the viewer with no Document root: nothing numbers them, and no reference can resolve.',
    render: () => (
      <DocumentViewer>
        <Clause id="term" title="Term">
          <Text>Twenty-four (24) months from the Effective Date.</Text>
        </Clause>
      </DocumentViewer>
    ),
  },
  accessibility: [
    'The root is an `article` named by `label`; `lang` marks a document in another language than the page.',
    'A grid page is a `section` whose reading order is its source order, never its visual placement: write fields in the order a person fills them.',
    'Print is an enhancement: the same markup reads and works without the print stylesheet.',
  ],
};
