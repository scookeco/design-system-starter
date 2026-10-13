import { Cluster, Document, Parties, Party, SignatureBlock } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [SignatureBlock],
  whenToUse: [
    'A party’s signature block in a `Document`: Signature, Name, Title and Date Signed, bound to the party’s `role` from `Parties`, never a person. Its colour is the party’s.',
    'Before signing each value is a tag in the party’s colour; with `onSign`, the Sign tag starts the app’s signing flow while that party can act. Signing fills the document’s values (`signature.<role>`, `date_signed.<role>`, `<role>_signer_name`, `<role>_signer_title`), and each value then reads as plain text in the space its tag held.',
  ],
  whenNotToUse: [
    { situation: 'Only a signature or a date in a form (a W-4’s Step 5)', instead: '`Signature` and `DateSigned`' },
    { situation: 'Showing who signed in a list or a record', instead: '`Timeline` or a `Table` row' },
  ],
  do: {
    caption: 'One block per party, each in its party’s colour.',
    render: () => (
      <Document label="Agreement">
        <Parties>
          <Party role="provider" name="Acme Corp" />
          <Party role="customer" name="Globex Inc." />
        </Parties>
        <Cluster gap="xl">
          <SignatureBlock role="provider" />
          <SignatureBlock role="customer" />
        </Cluster>
      </Document>
    ),
  },
  dont: {
    caption: 'Two parties in one colour: the reader can’t tell whose fields are whose.',
    render: () => (
      <Document label="Agreement">
        <Parties>
          <Party role="provider" name="Acme Corp" color={1} />
          <Party role="customer" name="Globex Inc." color={1} />
        </Parties>
        <Cluster gap="xl">
          <SignatureBlock role="provider" />
          <SignatureBlock role="customer" />
        </Cluster>
      </Document>
    ),
  },
  accessibility: [
    'The block is a description list: each label is a `<dt>` and its value a `<dd>`, so screen readers announce them as pairs.',
    'With `onSign`, the Sign tag is a button named “Sign as <party>”, at least the minimum target size, with a visible focus ring.',
    'A party’s colour is never the only cue: the page names each party over its block, and signed values are text.',
  ],
};
