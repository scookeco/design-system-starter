import { Cluster, DateSigned, Document, Initials, Parties, Party, Signature, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Signature, Initials, DateSigned],
  whenToUse: [
    'Where a party signs (`Signature`), initials (`Initials`, `eachPage` for every printed page) and the date it signed (`DateSigned`), each a tag in the party’s colour until signing fills the document’s values: `signature.<role>`, `initials.<role>`, `date_signed.<role>`.',
    '`onSign` makes the Sign tag a button, while that party can act, that starts the app’s adopt-signature flow.',
  ],
  whenNotToUse: [
    { situation: 'A party’s whole block (signature, name, title, date) at the end of an agreement', instead: '`SignatureBlock` on a `SignaturePage`' },
    { situation: 'Checking a box to agree', instead: '`Acknowledge`' },
  ],
  do: {
    caption: 'Tabs bound to a role, in its colour.',
    render: () => (
      <Document label="Form">
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <Cluster gap="lg" align="end">
          <Signature role="employee" />
          <DateSigned role="employee" />
          <Initials role="employee" />
        </Cluster>
      </Document>
    ),
  },
  dont: {
    caption: 'A typed signature line: nothing knows who signs there or whether they have.',
    render: () => (
      <Document label="Form">
        <Text>Signature: ____________________ Date: __________</Text>
      </Document>
    ),
  },
  accessibility: [
    'With `onSign`, the Sign tag is a button named “Sign as <party>”, at least the minimum target size, with a visible focus ring.',
    'Each tab says what it is in words (Sign, Initial, Date Signed); the colour only groups a party’s tabs.',
  ],
};
