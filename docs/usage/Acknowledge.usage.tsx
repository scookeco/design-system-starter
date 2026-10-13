import { Acknowledge, Document, Parties, Party, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Acknowledge],
  whenToUse: ['The acknowledgement that ends a policy or a handbook: a required box (`text` is its label), a signature and the date signed, all for one party (`role`). The box is the document’s `<role>_acknowledged` value.'],
  whenNotToUse: [
    { situation: 'An agreement both parties execute', instead: '`SignaturePage`' },
    { situation: 'A consent box with no signature', instead: '`DocumentCheckbox`' },
  ],
  do: {
    caption: 'Read, agreed and signed, by one party.',
    render: () => (
      <Document label="Handbook" lifecycle="filled">
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <Acknowledge role="employee" text="I have read and agree to the Employee Handbook" />
      </Document>
    ),
  },
  dont: {
    caption: '“By signing below you agree” and a signature: what was agreed isn’t captured on its own.',
    render: () => (
      <Document label="Handbook">
        <Text>By signing below you agree to the handbook. Signature: ________</Text>
      </Document>
    ),
  },
  accessibility: ['A fieldset named “Acknowledgement”: the box’s label is the statement agreed to, and the Sign button is named for the party.'],
};
