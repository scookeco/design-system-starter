import { Cluster, SignatureBlock } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [SignatureBlock],
  whenToUse: [
    'The end of a generated agreement (a DocumentViewer), one block per signer: Signature, Name, Title and Date Signed.',
    'Before signing, each value is a field tag in the recipient’s colour (`recipient`, color.category.*); pass `onSign` to make the Sign tag start the app’s signing flow.',
    'Once signed (`signature` set), the signature is drawn on its line and the values read as plain text, each in the space its tag held, so the document does not shift.',
  ],
  whenNotToUse: [
    { situation: 'Collecting a signer’s details in a form', instead: 'the form components (`TextField`, `DatePicker`) on a page' },
    { situation: 'Showing who signed in a list or a record', instead: '`Timeline` or a `Table` row' },
  ],
  do: {
    caption: 'One block per signer, side by side, each in its recipient’s colour.',
    render: () => (
      <Cluster gap="xl">
        <SignatureBlock name="Maya Okafor" title="Legal counsel" recipient={3} />
        <SignatureBlock name="Jon Park" title="Operations director" recipient={1} />
      </Cluster>
    ),
  },
  dont: {
    caption: 'Two signers in one colour: the reader can’t tell whose fields are whose.',
    render: () => (
      <Cluster gap="xl">
        <SignatureBlock name="Maya Okafor" recipient={1} />
        <SignatureBlock name="Jon Park" recipient={1} />
      </Cluster>
    ),
  },
  accessibility: [
    'The block is a description list: each label is a `<dt>` and its value a `<dd>`, so screen readers announce them as pairs.',
    'With `onSign`, the Sign tag is a button named “Sign as <name>”, at least the minimum target size, with a visible focus ring.',
    'A recipient’s colour is never the only cue: each block names its signer once signed, and the document says whose block it is.',
  ],
};
