import { Barcode, Document, Text } from '../../src/index';
import type { UsageDoc } from './types';

export const usage: UsageDoc = {
  covers: [Barcode],
  whenToUse: ['A document’s id or a verification link as a QR code (`symbology` qr), up to 213 bytes: on an invoice, a certificate, a printed form. Encoded by the system itself (no dependency) and drawn as SVG, dark on light in either theme.'],
  whenNotToUse: [
    { situation: 'A link people click on screen', instead: '`Link`' },
    { situation: 'A 1D barcode (Code 128) for a scanner at a till', instead: 'not drawn yet: add the symbology when a document needs it' },
  ],
  do: {
    caption: 'The id as a QR code, with its meaning in text beside it.',
    render: () => (
      <Document label="Invoice">
        <Barcode value="INV-2026-0413" />
        <Text>Scan to open this invoice.</Text>
      </Document>
    ),
  },
  dont: {
    caption: 'A QR code with nothing saying what it opens: people can’t tell whether to trust it.',
    render: () => (
      <Document label="Invoice">
        <Barcode value="INV-2026-0413" />
      </Document>
    ),
  },
  accessibility: ['An image named “QR code: <value>”, so the value is read out; put what scanning does in text beside it.'],
};
