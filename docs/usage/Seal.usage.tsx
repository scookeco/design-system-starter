import { Document, DocumentViewer, Seal, Text } from '../../src/index';
import type { UsageDoc } from './types';

const SEAL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Ccircle cx=%225%22 cy=%225%22 r=%224%22/%3E%3C/svg%3E';

export const usage: UsageDoc = {
  covers: [Seal],
  whenToUse: ['An issuer’s official seal or stamp on a certificate, a license or a notarised page, named by its `issuer`, at size.document.seal.'],
  whenNotToUse: [
    { situation: 'A company logo', instead: 'the `Letterhead` logo' },
    { situation: 'A signature', instead: 'the signature parts' },
  ],
  do: {
    caption: 'The seal named by its issuer.',
    render: () => (
      <DocumentViewer>
        <Document label="Certificate">
          <Seal issuer="Acme Training Institute" src={SEAL} />
        </Document>
      </DocumentViewer>
    ),
  },
  dont: {
    caption: '“(SEAL)” as text: nothing shows who issued it.',
    render: () => (
      <DocumentViewer>
        <Document label="Certificate">
          <Text>(SEAL)</Text>
        </Document>
      </DocumentViewer>
    ),
  },
  accessibility: ['An image named “Seal of <issuer>”.'],
};
