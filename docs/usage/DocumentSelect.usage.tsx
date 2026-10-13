import { Document, DocumentOption, DocumentSelect, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentSelect],
  whenToUse: ['A choice from a longer list in a document (governing law, a state): a native select while editable, the chosen option’s words otherwise. Options are `DocumentOption`s.'],
  whenNotToUse: [
    { situation: 'Two to four choices worth seeing at once', instead: '`DocumentRadioGroup`' },
    { situation: 'A choice in the app', instead: '`Select` or `Combobox`' },
  ],
  do: {
    caption: 'A select in the sentence, read as its words once generated.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement" lifecycle="filled">
          <Text>
            Governed by the laws of{' '}
            <DocumentSelect name="law" label="Governing law">
              <DocumentOption value="WA">Washington</DocumentOption>
              <DocumentOption value="NY">New York</DocumentOption>
            </DocumentSelect>
            .
          </Text>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'A blank where a fixed list belongs: people type “Wash.”, “WA” and “Washington State”.',
    render: () => (
      <DocumentViewer>
        <Document label="Agreement">
          <Text>Governed by the laws of ____________.</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A native select named by `label` (shown with `showLabel`); its first option asks for a choice.'],
};
