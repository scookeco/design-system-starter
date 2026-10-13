import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause } from '../Clause/Clause';
import { Xref } from '../Xref/Xref';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Text } from '../Text/Text';
import { Exhibit } from './Exhibit';

const meta = {
  title: 'Components/Exhibit',
  component: Exhibit,
  args: { id: 'dpa', title: 'Data Processing Agreement', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Exhibit>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two exhibits after the agreement's clauses: each restarts at 1, and references say which document they mean. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Clause id="privacy" title="Data Privacy and Security">
          <Text size="body-lg">
            Processing of Customer personal data is governed by <Xref to="dpa" />, and service levels by <Xref to="sla" />.
          </Text>
        </Clause>
        <Clause id="liability" title="Limitation of Liability">
          <Text size="body-lg">Each Party’s liability is capped at the fees of the prior twelve (12) months.</Text>
        </Clause>
        <Exhibit id="dpa" title="Data Processing Agreement">
          <Clause id="dpa-roles" title="Roles">
            <Text size="body-lg">For Customer personal data, Customer is the controller and Provider is the processor.</Text>
          </Clause>
          <Clause id="dpa-security" title="Security">
            <Text size="body-lg">
              Provider will maintain the measures described in <Xref to="privacy" />, and notify breaches under <Xref to="dpa-roles" />.
            </Text>
          </Clause>
        </Exhibit>
        <Exhibit id="sla" title="Service Level Agreement">
          <Clause id="sla-availability" title="Availability">
            <Text size="body-lg">Provider will make the platform available 99.9% of each calendar month.</Text>
          </Clause>
          <Clause id="sla-remedy" title="Sole Remedy">
            <Text size="body-lg">
              Service Credits are Customer’s sole remedy for missed availability, subject to <Xref to="liability" />. Data incidents are
              handled under <Xref to="dpa-security" />.
            </Text>
          </Clause>
        </Exhibit>
      </Document>
    </DocumentViewer>
  ),
};

/** An exhibit with its own label ("SOW-2") instead of the next letter; references use the label too. */
export const Labelled: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Clause id="services" title="Services">
          <Text size="body-lg">
            Provider will perform the work described in <Xref to="sow-2" />.
          </Text>
        </Clause>
        <Exhibit id="sow-2" title="Statement of Work" label="SOW-2">
          <Clause id="deliverables" title="Deliverables">
            <Text size="body-lg">A migration plan and a cut-over runbook.</Text>
          </Clause>
        </Exhibit>
      </Document>
    </DocumentViewer>
  ),
};
