import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Stack } from '../../primitives/Stack/Stack';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Heading } from '../Heading/Heading';
import { Switch } from '../Switch/Switch';
import { Text } from '../Text/Text';
import { Clause, ClauseRef, Term } from './Clause';

const meta = {
  title: 'Components/Clause',
  component: Clause,
  args: { id: 'fees', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Clause>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An MSA's clauses, with an optional one: switching it off renumbers every clause and reference after it. */
function Msa({ nonSolicitation }: { nonSolicitation: boolean }) {
  return (
    <DocumentViewer label="Master services agreement">
      <Heading level={1}>Master services agreement</Heading>
      <Text size="body-lg">
        This agreement is between Acme Corp (<Term define>Vendor</Term>) and Globex Inc. (<Term define>Customer</Term>).
      </Text>
      <Clause id="definitions" title="Definitions">
        <Text size="body-lg">
          <Term define>Confidential Information</Term> means any non-public information one party discloses to the other, in any form.
        </Text>
      </Clause>
      <Clause id="fees" title="Fees and payment">
        <Clause id="fees-invoices" title="Invoices">
          <Text size="body-lg">
            <Term>Vendor</Term> invoices monthly in arrears; <Term>Customer</Term> pays each invoice within thirty (30) days.
          </Text>
        </Clause>
        <Clause id="fees-disputes" title="Disputed amounts">
          <Text size="body-lg">
            <Term>Customer</Term> may withhold a disputed amount in good faith while the parties resolve it under{' '}
            <ClauseRef to="termination-breach" />.
          </Text>
        </Clause>
      </Clause>
      {nonSolicitation ? (
        <Clause id="non-solicitation" title="Non-solicitation">
          <Text size="body-lg">
            During the term and for twelve (12) months after, neither party solicits the other’s employees for hire.
          </Text>
        </Clause>
      ) : null}
      <Clause id="termination" title="Term and termination">
        <Text size="body-lg">Either party may end this agreement by written notice:</Text>
        <Clause id="termination-breach">
          <Text size="body-lg">if the other party materially breaches it and does not cure the breach within thirty (30) days; or</Text>
        </Clause>
        <Clause id="termination-insolvency">
          <Text size="body-lg">
            if the other party becomes insolvent. <ClauseRef to="confidentiality" /> survives any ending.
          </Text>
        </Clause>
      </Clause>
      <Clause id="confidentiality" title="Confidentiality">
        <Text size="body-lg">
          Each party keeps the other’s <Term>Confidential Information</Term> confidential for three (3) years after{' '}
          <ClauseRef to="termination" /> ends this agreement.
        </Text>
      </Clause>
    </DocumentViewer>
  );
}

/** Numbered clauses (1., 1.1, (a)), defined terms and references that follow the numbering. */
export const Default: Story = { render: () => <Msa nonSolicitation /> };

/** An optional clause switched off: everything after it renumbers, references included. */
export const Renumbered: Story = {
  render: function Toggle() {
    const [on, setOn] = useState(false);
    return (
      <Stack gap="md">
        <Switch label="Include non-solicitation" checked={on} onCheckedChange={setOn} />
        <Msa nonSolicitation={on} />
      </Stack>
    );
  },
};

/** What a generated draft can't resolve, marked in place: a missing clause, an undefined term, a term defined twice. */
export const Unresolved: Story = {
  render: () => (
    <DocumentViewer label="Order form">
      <Clause id="fees" title="Fees">
        <Text size="body-lg">
          The <Term define>Fees</Term> are as in <ClauseRef to="pricing" />, payable for the <Term>Services</Term>. The{' '}
          <Term define>Fees</Term> exclude tax.
        </Text>
      </Clause>
    </DocumentViewer>
  ),
};
