import { Document, DocumentOption, DocumentRadioGroup, DocumentViewer, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [DocumentRadioGroup, DocumentOption],
  whenToUse: [
    'One choice of a few in a document, all visible (a W-4’s filing status): a `DocumentOption` per choice, its value stored under `name`.',
    '`DocumentOption` is also a `DocumentSelect`’s option.',
  ],
  whenNotToUse: [
    { situation: 'Many choices, or a long list', instead: '`DocumentSelect`' },
    { situation: 'Yes or no', instead: '`DocumentCheckbox`' },
  ],
  do: {
    caption: 'A group named by its question, one radio per answer.',
    render: () => (
      <DocumentViewer>
        <Document label="Form" lifecycle="filled">
          <DocumentRadioGroup name="status" label="Filing status">
            <DocumentOption value="single">Single</DocumentOption>
            <DocumentOption value="joint">Married filing jointly</DocumentOption>
          </DocumentRadioGroup>
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: 'Choices as text to circle: nothing records which one was chosen.',
    render: () => (
      <DocumentViewer>
        <Document label="Form">
          <Text>Filing status (circle one): Single / Married filing jointly</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['A `fieldset` named by its `legend` (`label`); native radios, so arrow keys move between them. `required` asks for one.'],
};
