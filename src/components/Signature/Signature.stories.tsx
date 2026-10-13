import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from '../../primitives/Cluster/Cluster';
import { Document } from '../Document/Document';
import type { DocumentValues } from '../Document/data';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Margin } from '../Margin/Margin';
import { Parties, Party } from '../Parties/Parties';
import { Text } from '../Text/Text';
import { DateSigned, Initials, Signature } from './Signature';

const meta = {
  title: 'Components/Signature',
  component: Signature,
  args: { role: 'employee' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Signature>;

export default meta;
type Story = StoryObj<typeof meta>;

function Step5({ values, onSign }: { values?: DocumentValues; onSign?: () => void }) {
  return (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" lifecycle={values ? 'executed' : 'filled'} values={values ?? {}}>
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <Text size="body-lg">Under penalties of perjury, I declare that this certificate is correct.</Text>
        <Cluster gap="lg" align="end">
          <Signature role="employee" onSign={onSign} />
          <DateSigned role="employee" />
          <Initials role="employee" />
        </Cluster>
      </Document>
    </DocumentViewer>
  );
}

/** A sign-here, a date-signed and an initial-here tab, in the party's colour. */
export const Default: Story = { render: () => <Step5 /> };

/** With onSign: the Sign tag is a button while the party can act. */
export const WithSignAction: Story = { render: () => <Step5 onSign={() => undefined} /> };

/** Signed: the signature drawn, the date and the initials filled. */
export const Signed: Story = {
  render: () => <Step5 values={{ signature: { employee: 'Maya Okafor' }, date_signed: { employee: '2026-10-14' }, initials: { employee: 'MO' } }} />,
};

/** Initials on every printed page, in the margin. */
export const InitialsEachPage: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Lease">
        <Parties>
          <Party role="tenant" name="Tenant" />
        </Parties>
        <Text size="body-lg">The tenant initials every page.</Text>
        <Margin>
          <Initials role="tenant" eachPage />
        </Margin>
      </Document>
    </DocumentViewer>
  ),
};
