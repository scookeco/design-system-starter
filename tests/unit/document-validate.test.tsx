// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Barcode,
  Clause,
  Computed,
  Conditional,
  Document,
  DocumentField,
  DocumentGrid,
  DocumentPage,
  Parties,
  Party,
  Repeat,
  Signature,
  Text,
  Xref,
  exportDocument,
  expressionProblems,
  validateDocument,
} from '../../src/index';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('validateDocument', () => {
  it('passes a well-formed document to be filled', () => {
    const { container } = render(
      <Document label="W-4" lifecycle="filled">
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <DocumentField name="first_name" label="First name" role="employee" />
        <Signature role="employee" />
      </Document>,
    );
    expect(validateDocument(container)).toEqual({ errors: [], warnings: [] });
  });

  it('fails each rule the framework sets, from a fixture that breaks it', () => {
    const { container } = render(
      <Document label="Broken" lifecycle="filled">
        <Parties>
          <Party role="employee" name="Employee" />
        </Parties>
        <Clause id="a" title="A">
          <Text>
            See <Xref to="missing" />.
          </Text>
        </Clause>
        <DocumentField name="unassigned" label="Unassigned" />
        <DocumentField name="stranger" label="Stranger" role="contractor" />
        <DocumentField name="placed" label="Placed outside a grid" role="employee" area={{ row: 1, column: 1 }} />
      </Document>,
    );
    const { errors, warnings } = validateDocument(container);
    expect(errors).toEqual([
      'Unresolved reference: Section\u00a0[missing?].',
      'Unassigned field "unassigned": give it a role, or a fieldset or role region with one.',
      '"stranger" is for role "contractor", which Parties does not declare.',
      '"placed" has an area outside a DocumentGrid.',
    ]);
    expect(warnings).toEqual(['Signer "employee" has no Signature.']);
  });

  it('finds more than one root, and none', () => {
    const two = render(
      <>
        <Document label="One">{null}</Document>
        <Document label="Two">{null}</Document>
      </>,
    );
    expect(validateDocument(two.container).errors).toEqual(['A document has exactly one root: found 2.']);
    cleanup();
    const none = render(<Text>No document</Text>);
    expect(validateDocument(none.container).errors).toEqual(['A document has exactly one root: found 0.']);
  });

  it('allows unassigned fields in a generated document, and area on a grid', () => {
    const { container } = render(
      <Document label="Invoice" shell="grid">
        <DocumentPage>
          <DocumentGrid>
            <DocumentField name="po" label="PO" area={{ row: 1, column: 1, columnSpan: 4 }} />
          </DocumentGrid>
        </DocumentPage>
      </Document>,
    );
    expect(validateDocument(container).errors).toEqual([]);
  });
});

describe('expressionProblems', () => {
  it('reports every when and formula that does not parse', () => {
    const { container } = render(
      <Document label="Form">
        <Conditional when="a = 1">
          <Text>x</Text>
        </Conditional>
        <Computed name="total" formula="sum(" />
        <Computed name="fine" formula="1 + 2" />
      </Document>,
    );
    expect(expressionProblems(container)).toHaveLength(2);
  });
});

describe('exportDocument', () => {
  it('reads every value by name from the rendered document: rows as lists, computed values included', () => {
    const { container } = render(
      <Document label="Quote" type="quote" version="2" lifecycle="filled" values={{ customer: 'Globex', items: [{ qty: 2, price: 1000 }, { qty: 1, price: 500 }] }}>
        <DocumentField name="customer" label="Customer" />
        <Repeat name="items">
          <DocumentField name="qty" label="Qty" type="number" />
          <DocumentField name="price" label="Price" type="currency" />
          <Computed name="amount" formula="qty * price" />
        </Repeat>
        <Computed name="total" formula="sum(items.amount)" />
      </Document>,
    );
    expect(exportDocument(container)).toEqual({
      type: 'quote',
      version: '2',
      lifecycle: 'filled',
      values: {
        customer: 'Globex',
        items: [
          { qty: 2, price: 1000, amount: 2000 },
          { qty: 1, price: 500, amount: 500 },
        ],
        total: 2500,
      },
    });
  });
});

describe('Barcode', () => {
  it('draws a QR code named by what it encodes, and reports a value too long', () => {
    const { container } = render(<Barcode value="INV-2026-0413" />);
    const svg = container.querySelector('svg[data-doc="barcode"]');
    expect(svg?.getAttribute('aria-label')).toBe('QR code: INV-2026-0413');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 29 29');
    cleanup();
    const long = render(<Barcode value={'x'.repeat(300)} />);
    expect(long.container.querySelector('svg')).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Too long'));
  });
});
