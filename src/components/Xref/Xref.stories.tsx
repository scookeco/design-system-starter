import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clause, Term } from '../Clause/Clause';
import { Document } from '../Document/Document';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Exhibit } from '../Exhibit/Exhibit';
import { Text } from '../Text/Text';
import { Xref } from './Xref';

const meta = {
  title: 'Components/Xref',
  component: Xref,
  args: { to: 'fees' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Xref>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every kind of target: a clause, a sub-clause, an exhibit, a clause across the exhibit's edge, and a defined term (as written and as the sentence needs it). */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Clause id="fees" title="Fees">
          <Text size="body-lg">
            <Term>Customer</Term> pays the fees in <Xref to="invoices" />, subject to <Xref to="dpa" /> and <Xref to="dpa-roles" />.
          </Text>
          <Clause id="invoices" title="Invoices">
            <Text size="body-lg">
              <Xref to="def-customer">Customer’s</Xref> invoices are due net 30; see <Xref to="fees" prefix="clause" />.
            </Text>
          </Clause>
        </Clause>
        <Exhibit id="dpa" title="Data Processing Agreement">
          <Clause id="dpa-roles" title="Roles">
            <Text size="body-lg">
              <Xref to="def-customer" /> is the controller, as in <Xref to="fees" />.
            </Text>
          </Clause>
        </Exhibit>
      </Document>
    </DocumentViewer>
  ),
};

/** A reference to an id the document doesn't have: marked in place and reported in the console. */
export const Broken: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Order form">
        <Clause id="fees" title="Fees">
          <Text size="body-lg">
            Fees are as in <Xref to="pricing" />.
          </Text>
        </Clause>
      </Document>
    </DocumentViewer>
  ),
};
