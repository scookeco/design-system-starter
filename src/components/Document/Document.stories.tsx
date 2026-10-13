import type { Meta, StoryObj } from '@storybook/react-vite';
import { Address } from '../Address/Address';
import { Barcode } from '../Barcode/Barcode';
import { Clause } from '../Clause/Clause';
import { Computed } from '../Computed/Computed';
import { Definition, Definitions } from '../Definitions/Definitions';
import { DocumentCheckbox } from '../DocumentCheckbox/DocumentCheckbox';
import { DocumentField } from '../DocumentField/DocumentField';
import { DocumentFooter, DocumentHeader } from '../DocumentHeader/DocumentHeader';
import { DocumentOption, DocumentRadioGroup } from '../DocumentRadioGroup/DocumentRadioGroup';
import { Recital, Recitals } from '../DocumentTitle/DocumentTitle';
import { DocumentViewer } from '../DocumentViewer/DocumentViewer';
import { Exhibit } from '../Exhibit/Exhibit';
import { Heading } from '../Heading/Heading';
import { KeyValue, KeyValueItem } from '../KeyValue/KeyValue';
import { Letterhead } from '../Letterhead/Letterhead';
import { LineItems } from '../LineItems/LineItems';
import { Margin } from '../Margin/Margin';
import { Parties, Party } from '../Parties/Parties';
import { RoleRegion } from '../RoleRegion/RoleRegion';
import { DateSigned, Initials, Signature } from '../Signature/Signature';
import { SignaturePage, SignatureParty } from '../SignaturePage/SignaturePage';
import { Step } from '../Step/Step';
import { Text } from '../Text/Text';
import { Watermark } from '../Watermark/Watermark';
import { Xref } from '../Xref/Xref';
import { Document, DocumentFlow, DocumentGrid, DocumentPage } from './Document';

const meta = {
  title: 'Components/Document',
  component: Document,
  args: { label: 'Master services agreement', children: null },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Document>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The clauses every flow story shows. */
function Clauses() {
  return (
    <DocumentFlow>
      <Clause id="term" title="Term">
        <Text size="body-lg">
          This Agreement begins on the Effective Date and continues for twenty-four (24) months, subject to <Xref to="termination" />.
        </Text>
      </Clause>
      <Clause id="termination" title="Termination">
        <Text size="body-lg">Either Party may terminate for material breach not cured within thirty (30) days of written notice.</Text>
      </Clause>
    </DocumentFlow>
  );
}

/** A flow document: clauses reflow as one continuous sheet on screen; the signature page starts a new page only in print. */
export const Default: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master services agreement" type="msa" version="3.2" lifecycle="negotiated">
        <Clauses />
        <DocumentPage>
          <Text size="body-lg">IN WITNESS WHEREOF, the Parties have executed this Agreement.</Text>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};

/** The same document without a viewer: what prints. No canvas or sheet, just the document's own layout. */
export const WithoutViewer: Story = {
  render: () => (
    <Document label="Master services agreement" type="msa">
      <Clauses />
    </Document>
  ),
};

/** A grid document: a fixed letter page, on screen too, with a 12-column grid its boxes are placed on. */
export const GridPage: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Employee's withholding certificate" type="w-4" version="2026" lifecycle="filled" shell="grid" headingLevel={3}>
        <DocumentPage n={1}>
          <DocumentGrid cols={2}>
            <Heading level={2} size={3}>
              Form W-4
            </Heading>
            <Text>Step 1: Enter personal information</Text>
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};

/** A landscape form page: the page's sides swap. */
export const GridPageLandscape: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Inspection checklist" type="inspection" shell="grid" headingLevel={3}>
        <DocumentPage orientation="landscape" n={1}>
          <DocumentGrid cols={12} rows={4}>
            <Heading level={2} size={3}>
              Safety inspection
            </Heading>
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};

/** The framework's worked example 12.1: a W-4, a grid shell with flat steps and two roles. Every box sits by row and column; the employer's block is a role region. */
export const W4: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Form W-4: Employee's Withholding Certificate" type="w-4" version="2026" lifecycle="filled" shell="grid" headingLevel={3}>
        <Parties>
          <Party role="employee" name="Employee" order={1} />
          <Party role="employer" name="Employer" order={2} />
        </Parties>
        <DocumentPage size="letter" n={1}>
          <DocumentHeader pages="all">Form W-4: Employee’s Withholding Certificate</DocumentHeader>
          <DocumentGrid cols={12}>
            <Step n={1} title="Enter personal information" area={{ row: 1, column: 1, columnSpan: 12 }} />
            <DocumentField name="first_name" label="First name and middle initial" showLabel role="employee" required area={{ row: 2, column: 1, rowSpan: 2, columnSpan: 5 }} />
            <DocumentField name="last_name" label="Last name" showLabel role="employee" required area={{ row: 2, column: 6, rowSpan: 2, columnSpan: 4 }} />
            <DocumentField name="ssn" label="Social security number" type="ssn" showLabel role="employee" required area={{ row: 2, column: 10, rowSpan: 2, columnSpan: 3 }} />
            <DocumentField name="address" label="Address" showLabel role="employee" required area={{ row: 4, column: 1, rowSpan: 2, columnSpan: 12 }} />
            <DocumentRadioGroup name="filing_status" label="Filing status" role="employee" required area={{ row: 6, column: 1, rowSpan: 2, columnSpan: 12 }}>
              <DocumentOption value="single">Single or Married filing separately</DocumentOption>
              <DocumentOption value="joint">Married filing jointly or Qualifying surviving spouse</DocumentOption>
              <DocumentOption value="hoh">Head of household</DocumentOption>
            </DocumentRadioGroup>
            <Step n={2} title="Multiple jobs or spouse works" optional area={{ row: 9, column: 1, columnSpan: 12 }} />
            <DocumentCheckbox name="multiple_jobs" label="Check here if there are only two jobs total" role="employee" area={{ row: 10, column: 1, columnSpan: 12 }} />
            <Step n={5} title="Sign here" area={{ row: 12, column: 1, columnSpan: 12 }} />
            <Signature role="employee" area={{ row: 13, column: 1, rowSpan: 2, columnSpan: 8 }} />
            <DateSigned role="employee" area={{ row: 13, column: 9, rowSpan: 2, columnSpan: 4 }} />
            <RoleRegion role="employer" area={{ row: 16, column: 1, rowSpan: 3, columnSpan: 12 }}>
              <DocumentField name="employer_name" label="Employer’s name and address" showLabel required />
              <DocumentField name="first_date" label="First date of employment" type="date" showLabel required />
              <DocumentField name="ein" label="Employer identification number (EIN)" type="ein" showLabel required />
            </RoleRegion>
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};

/** The framework's worked example 12.2: an MSA, a flow shell with recitals, definitions, nested clauses, an exhibit and a signature page; DRAFT until executed; initials on every printed page. */
export const Msa: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Master Services Agreement" type="msa" version="3.2" lifecycle="negotiated">
        <Parties>
          <Party role="customer" name="Fontara, Inc." kind="signer" order={1} />
          <Party role="vendor" name="Flexcorp LLC" kind="signer" order={1} />
        </Parties>
        <Watermark />
        <DocumentHeader pages="rest">Master Services Agreement · Confidential</DocumentHeader>
        <DocumentFlow>
          <Recitals>
            <Recital>Customer wishes to obtain certain services from Vendor.</Recital>
            <Recital>Vendor is willing to provide such services on the terms set out below.</Recital>
          </Recitals>
          <Definitions>
            <Definition term="Services" id="def-services">
              The services described in each <Xref to="exhibit-a" />.
            </Definition>
            <Definition term="Effective Date" id="def-effective-date">
              The date of the last signature below.
            </Definition>
          </Definitions>
          <Clause id="term" title="Term">
            <Clause id="term-initial">
              <Text size="body-lg">
                This Agreement begins on the <Xref to="def-effective-date" /> and continues for{' '}
                <DocumentField name="initial_term" label="Initial term" type="duration" role="vendor" required />, subject to <Xref to="termination" />.
              </Text>
            </Clause>
            <Clause id="term-renewal">
              <Text size="body-lg">Thereafter it renews automatically for successive one-year periods unless either party gives notice.</Text>
            </Clause>
          </Clause>
          <Clause id="termination" title="Termination">
            <Clause id="termination-breach">
              <Text size="body-lg">Either party may terminate for material breach not cured within thirty (30) days of notice.</Text>
            </Clause>
          </Clause>
          <Exhibit id="exhibit-a" title="Statement of Work" label="A">
            <Clause id="sow-scope">
              <Text size="body-lg">
                Vendor will perform the <Xref to="def-services" /> described in this Exhibit.
              </Text>
            </Clause>
          </Exhibit>
        </DocumentFlow>
        <SignaturePage witness="In witness whereof, the parties have executed this Agreement.">
          <SignatureParty role="customer" />
          <SignatureParty role="vendor" />
        </SignaturePage>
        <DocumentFooter pages="all" pageNumber="page" />
        <Margin side="end">
          <Initials role="customer" eachPage />
          <Initials role="vendor" eachPage />
        </Margin>
      </Document>
    </DocumentViewer>
  ),
};

const INVOICE = {
  issuer: ['Flexcorp LLC', '200 Harbor Way', 'Portland, OR 97201'],
  invoice_date: '2026-10-13',
  items: [
    { description: 'Implementation services', qty: 1, unit_price: 500000 },
    { description: 'Platform licences (annual)', qty: 25, unit_price: 12000 },
  ],
};

/** The framework's worked example 12.3: an invoice, a generated grid shell with no roles: metadata, two addresses, line items with computed amounts and totals, and a QR code for its number. */
export const Invoice: Story = {
  render: () => (
    <DocumentViewer>
      <Document label="Invoice INV-2026-0413" type="invoice" lifecycle="generated" shell="grid" headingLevel={3} values={INVOICE}>
        <DocumentPage size="letter">
          <Letterhead>
            <Address name="issuer" lines={INVOICE.issuer} />
          </Letterhead>
          <DocumentGrid cols={12}>
            <Address name="bill_to" label="Bill to" lines={['Fontara, Inc.', '1 Main Street', 'Seattle, WA 98101']} area={{ row: 1, column: 1, rowSpan: 3, columnSpan: 6 }} />
            <KeyValue area={{ row: 1, column: 8, rowSpan: 3, columnSpan: 5 }}>
              <KeyValueItem label="Invoice">INV-2026-0413</KeyValueItem>
              <KeyValueItem label="Date">
                <DocumentField name="invoice_date" label="Date" type="date" />
              </KeyValueItem>
              <KeyValueItem label="Terms">Net 30</KeyValueItem>
            </KeyValue>
            <LineItems
              name="items"
              caption="Line items"
              columns={[{ label: 'Description' }, { label: 'Qty', numeric: true }, { label: 'Unit price', numeric: true }, { label: 'Amount', numeric: true }]}
              area={{ row: 5, column: 1, rowSpan: 6, columnSpan: 12 }}
            >
              <DocumentField name="description" label="Description" />
              <DocumentField name="qty" label="Qty" type="number" />
              <DocumentField name="unit_price" label="Unit price" type="currency" />
              <Computed name="amount" formula="qty * unit_price" format="currency" />
            </LineItems>
            <KeyValue area={{ row: 12, column: 8, rowSpan: 3, columnSpan: 5 }}>
              <KeyValueItem label="Subtotal">
                <Computed name="subtotal" formula="sum(items.amount)" format="currency" />
              </KeyValueItem>
              <KeyValueItem label="Tax (8.5%)">
                <Computed name="tax" formula="subtotal * 0.085" format="currency" />
              </KeyValueItem>
              <KeyValueItem label="Total" emphasis>
                <Computed name="total" formula="subtotal + tax" format="currency" />
              </KeyValueItem>
            </KeyValue>
            <Barcode value="INV-2026-0413" symbology="qr" area={{ row: 16, column: 1, rowSpan: 3, columnSpan: 2 }} />
          </DocumentGrid>
        </DocumentPage>
      </Document>
    </DocumentViewer>
  ),
};
