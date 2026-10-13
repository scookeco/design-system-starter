import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document, DocumentCell, DocumentGrid, DocumentPage } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Heading } from '../Heading/Heading';
import { Seal } from './Seal';

/** A stand-in seal: two rings and a star, as an issuer's image would be. */
const SEAL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#1e3a8a" stroke-width="4"/><circle cx="50" cy="50" r="36" fill="none" stroke="#1e3a8a" stroke-width="2"/><path d="M50 26l6 17h18l-14 11 5 18-15-11-15 11 5-18-14-11h18z" fill="#1e3a8a"/></svg>',
)}`;

const meta = {
  title: 'Components/Seal',
  component: Seal,
  args: { issuer: 'Acme Training Institute', src: SEAL },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Seal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A completion certificate: one page, its title centred and the issuer's seal placed on the grid. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Certificate of completion" type="certificate" shell="grid" headingLevel={3}>
        <DocumentPage orientation="landscape">
          <DocumentGrid cols={12}>
            <DocumentCell area={{ row: 3, column: 1, rowSpan: 2, columnSpan: 12 }}>
              <Heading level={2} size={2}>
                Certificate of completion
              </Heading>
            </DocumentCell>
            <Seal issuer="Acme Training Institute" src={SEAL} area={{ row: 8, column: 6, rowSpan: 3, columnSpan: 2 }} />
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};
