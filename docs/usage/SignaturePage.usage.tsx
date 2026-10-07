import { SignatureBlock, SignaturePage, SignatureParty, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [SignaturePage, SignatureParty],
  whenToUse: [
    'The execution page at the end of an agreement: the “IN WITNESS WHEREOF” line, then each party’s name over its `SignatureBlock`, each in its recipient’s colour.',
    'One, two or three parties: two sit side by side, a third (an escrow agreement’s agent) moves to the second row under the first, and a single party keeps a column’s width.',
  ],
  whenNotToUse: [
    { situation: 'One signer’s fields in the middle of a document (initials, a date)', instead: 'a `SignatureBlock` on its own' },
    { situation: 'A list of who has signed so far', instead: '`Timeline`' },
  ],
  do: {
    caption: 'One party per SignatureParty, each signer in their own recipient colour.',
    render: () => (
      <SignaturePage>
        <SignatureParty name="Acme Corp">
          <SignatureBlock name="Maya Okafor" recipient={3} />
        </SignatureParty>
        <SignatureParty name="Globex Inc.">
          <SignatureBlock name="Jon Park" recipient={1} />
        </SignatureParty>
      </SignaturePage>
    ),
  },
  dont: {
    caption: 'Signers stacked under one typed heading: who signs for which party is lost.',
    render: () => (
      <>
        <Text>Signatures:</Text>
        <SignatureBlock name="Maya Okafor" recipient={1} />
        <SignatureBlock name="Jon Park" recipient={1} />
      </>
    ),
  },
  accessibility: [
    'The page is a `section` named “Signatures”; each party’s name comes before its block in reading order.',
    'The columns reflow with the space, never by viewport breakpoints, and every SignatureBlock keeps its own accessible names.',
  ],
};
