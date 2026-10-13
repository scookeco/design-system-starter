import { Document, Parties, Party, SignatureBlock, SignaturePage, SignatureParty, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [SignaturePage, SignatureParty],
  whenToUse: [
    'The execution page at the end of an agreement, a page of its own in print: the “IN WITNESS WHEREOF” line, then each party (`role`) by name over its `SignatureBlock`, in its colour.',
    'One, two or three parties: two sit side by side, a third (an escrow agreement’s agent) moves to the second row under the first, and a single party keeps a column’s width.',
  ],
  whenNotToUse: [
    { situation: 'One signer’s fields in the middle of a document (initials, a date)', instead: '`Signature`, `Initials`, `DateSigned`' },
    { situation: 'A list of who has signed so far', instead: '`Timeline`' },
  ],
  do: {
    caption: 'Parties declared once, then one SignatureParty each.',
    render: () => (
      <Document label="Agreement">
        <Parties>
          <Party role="provider" name="Acme Corp" />
          <Party role="customer" name="Globex Inc." />
        </Parties>
        <SignaturePage>
          <SignatureParty role="provider" />
          <SignatureParty role="customer" />
        </SignaturePage>
      </Document>
    ),
  },
  dont: {
    caption: 'Signers stacked under one typed heading: who signs for which party is lost.',
    render: () => (
      <Document label="Agreement">
        <Parties>
          <Party role="provider" name="Acme Corp" />
        </Parties>
        <Text>Signatures:</Text>
        <SignatureBlock role="provider" />
      </Document>
    ),
  },
  accessibility: [
    'The page is a `section` named “Signatures”; each party’s name comes before its block in reading order.',
    'The columns reflow with the space, never by viewport breakpoints, and every SignatureBlock keeps its own accessible names.',
  ],
};
