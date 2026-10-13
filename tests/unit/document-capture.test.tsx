// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Clause,
  Computed,
  Conditional,
  Document,
  DocumentAttachment,
  DocumentCheckbox,
  DocumentField,
  DocumentFieldset,
  DocumentOption,
  DocumentRadioGroup,
  DocumentSelect,
  DocumentViewer,
  KeyValue,
  KeyValueItem,
  LineItems,
  Repeat,
  Text,
  type DocumentValues,
} from '../../src/index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DocumentField', () => {
  it('reads as text when the document is generated: filled, blank, or its placeholder', () => {
    const { container } = render(
      <Document label="Order" values={{ customer: 'Acme Corp', fee: 125050, start: '2026-10-14' }}>
        <Text>
          A <DocumentField name="customer" label="Customer" /> B <DocumentField name="po" label="PO" /> C{' '}
          <DocumentField name="signer" label="Signer" placeholder="Signer’s name" /> D <DocumentField name="fee" label="Fee" type="currency" /> E{' '}
          <DocumentField name="start" label="Start" type="date" />
        </Text>
      </Document>,
    );
    expect(container.textContent).toBe('A Acme Corp B  C Signer’s name D $1,250.50 E October 14, 2026');
    expect(container.querySelector('[data-state="blank"]')?.getAttribute('data-name')).toBe('po');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('is a labelled input while the document is filled, storing numbers and money as numbers', () => {
    const changes: DocumentValues[] = [];
    render(
      <Document label="Form" lifecycle="filled" onValuesChange={(v) => changes.push(v)}>
        <DocumentField name="qty" label="Quantity" type="number" required />
        <DocumentField name="price" label="Unit price" type="currency" />
        <DocumentField name="ssn" label="Social security number" type="ssn" role="employee" />
      </Document>,
    );
    const qty = screen.getByRole('textbox', { name: 'Quantity' });
    expect(qty).toHaveProperty('required', true);
    fireEvent.change(qty, { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Unit price' }), { target: { value: '12.50' } });
    expect(changes.at(-1)).toEqual({ qty: 3, price: 1250 });
    const ssn = screen.getByRole('textbox', { name: 'Social security number' });
    expect(ssn.getAttribute('pattern')).toBe('[0-9]{3}-?[0-9]{2}-?[0-9]{4}');
    expect(ssn.closest('[data-doc="field"]')?.getAttribute('data-role')).toBe('employee');
  });

  it('announces a placeholder that fills, once, in the viewer’s live region', () => {
    function Filling() {
      const [values, setValues] = useState<DocumentValues>({});
      return (
        <DocumentViewer>
          <Document label="Agreement" values={values}>
            <Text>
              Effective <DocumentField name="effective" label="Effective date" placeholder="when signed" announceAs="Effective date" />
            </Text>
            <button type="button" onClick={() => setValues({ effective: '14 October 2026' })}>
              Sign
            </button>
          </Document>
        </DocumentViewer>
      );
    }
    const { container } = render(<Filling />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Effective date filled: 14 October 2026');
    expect(container.querySelector('[data-state="filled-now"]')?.textContent).toBe('14 October 2026');
  });
});

describe('choices, fieldsets and attachments', () => {
  it('a fieldset’s role cascades to its fields unless one says otherwise', () => {
    const { container } = render(
      <Document label="W-4" lifecycle="filled">
        <DocumentFieldset legend="Employer" role="employer">
          <DocumentField name="employer_name" label="Employer’s name" />
          <DocumentField name="note" label="Note" role="hr" />
          <DocumentCheckbox name="first_job" label="First job" />
        </DocumentFieldset>
      </Document>,
    );
    expect([...container.querySelectorAll('[data-name]')].map((el) => el.getAttribute('data-role'))).toEqual(['employer', 'hr', 'employer']);
    expect(screen.getByRole('group', { name: 'Employer' })).toBeTruthy();
  });

  it('a radio group, a select and a checkbox store what is chosen', () => {
    const changes: DocumentValues[] = [];
    render(
      <Document label="W-4" lifecycle="filled" onValuesChange={(v) => changes.push(v)}>
        <DocumentRadioGroup name="status" label="Filing status" required>
          <DocumentOption value="single">Single</DocumentOption>
          <DocumentOption value="joint">Married filing jointly</DocumentOption>
        </DocumentRadioGroup>
        <DocumentSelect name="state" label="State">
          <DocumentOption value="WA">Washington</DocumentOption>
          <DocumentOption value="OR">Oregon</DocumentOption>
        </DocumentSelect>
        <DocumentCheckbox name="multiple_jobs" label="I hold more than one job" />
      </Document>,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Married filing jointly' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'State' }), { target: { value: 'OR' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'I hold more than one job' }));
    expect(changes.at(-1)).toEqual({ status: 'joint', state: 'OR', multiple_jobs: true });
    expect(screen.getByRole('radio', { name: 'Single' })).toHaveProperty('required', true);
  });

  it('read back as words when the document is executed', () => {
    const { container } = render(
      <Document label="W-4" lifecycle="executed" values={{ state: 'OR', proof: ['lease.pdf', 'bill.pdf'] }}>
        <DocumentSelect name="state" label="State">
          <DocumentOption value="WA">Washington</DocumentOption>
          <DocumentOption value="OR">Oregon</DocumentOption>
        </DocumentSelect>
        <DocumentAttachment name="proof" label="Proof of address" multiple />
      </Document>,
    );
    expect(container.querySelector('[data-doc="select"]')?.textContent).toBe('Oregon');
    expect(container.querySelector('[data-doc="attachment"]')?.textContent).toBe('Proof of addresslease.pdf and bill.pdf');
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('Conditional', () => {
  it('shows its block while `when` holds; off, its fields are disabled and not required, and its clauses take no number', () => {
    const { container } = render(
      <Document label="W-4" lifecycle="filled">
        <DocumentCheckbox name="multiple_jobs" label="I hold more than one job" />
        <Conditional when="multiple_jobs == true">
          <Clause id="step2" title="Multiple jobs">
            <DocumentField name="other_income" label="Other income" required />
          </Clause>
        </Conditional>
        <Clause id="sign" title="Sign">
          <Text>Sign here.</Text>
        </Clause>
      </Document>,
    );
    const block = container.querySelector('[data-doc="conditional"]');
    expect(block?.getAttribute('data-off')).toBe('true');
    expect(block?.getAttribute('data-print')).toBe('all');
    const income = screen.getByRole('textbox', { name: 'Other income', hidden: true });
    expect(income).toHaveProperty('disabled', true);
    expect(income).toHaveProperty('required', false);
    expect(container.querySelector<HTMLElement>('[data-clause="sign"] .clause__number')?.dataset.number).toBe('1.');
    fireEvent.click(screen.getByRole('checkbox', { name: 'I hold more than one job' }));
    expect(block?.hasAttribute('data-off')).toBe(false);
    expect(income).toHaveProperty('required', true);
  });

  it('reports an expression that does not parse, and shows its block', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { container } = render(
      <Document label="Form">
        <Conditional when="a = 1">
          <Text>Shown.</Text>
        </Conditional>
      </Document>,
    );
    expect(container.querySelector('[data-off]')).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Conditional:'));
  });
});

describe('Repeat, Computed and LineItems', () => {
  it('repeats a row template, adds and removes rows within min and max', () => {
    const changes: DocumentValues[] = [];
    render(
      <Document label="Application" lifecycle="filled" onValuesChange={(v) => changes.push(v)}>
        <Repeat name="employment_history" min={1} max={2} addLabel="Add employer">
          <DocumentField name="employer" label="Employer" />
        </Repeat>
      </Document>,
    );
    expect(screen.getAllByRole('textbox', { name: 'Employer' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Employer' }), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add employer' }));
    expect(screen.getAllByRole('textbox', { name: 'Employer' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Add employer' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Remove ?row 1$/ }));
    expect(changes.at(-1)).toEqual({ employment_history: [{}] });
  });

  it('computes per row and over rows: an invoice’s amounts, subtotal, tax and total', () => {
    const values = {
      items: [
        { description: 'Setup', qty: 1, unit_price: 50000 },
        { description: 'Licences', qty: 10, unit_price: 12000 },
      ],
    };
    const { container } = render(
      <Document label="Invoice" values={values}>
        <LineItems name="items" caption="Line items" columns={[{ label: 'Description' }, { label: 'Qty', numeric: true }, { label: 'Unit price', numeric: true }, { label: 'Amount', numeric: true }]}>
          <DocumentField name="description" label="Description" />
          <DocumentField name="qty" label="Qty" type="number" />
          <DocumentField name="unit_price" label="Unit price" type="currency" />
          <Computed name="amount" formula="qty * unit_price" format="currency" />
        </LineItems>
        <KeyValue>
          <KeyValueItem label="Subtotal">
            <Computed name="subtotal" formula="sum(items.amount)" format="currency" />
          </KeyValueItem>
          <KeyValueItem label="Tax">
            <Computed name="tax" formula="subtotal * 0.085" format="currency" />
          </KeyValueItem>
          <KeyValueItem label="Total" emphasis>
            <Computed name="total" formula="subtotal + tax" format="currency" />
          </KeyValueItem>
        </KeyValue>
      </Document>,
    );
    const out = (name: string) => container.querySelector(`output[data-name="${name}"]`)?.textContent;
    expect(out('items.0.amount')).toBe('$500.00');
    expect(out('items.1.amount')).toBe('$1,200.00');
    expect(out('subtotal')).toBe('$1,700.00');
    expect(out('tax')).toBe('$144.50');
    expect(out('total')).toBe('$1,844.50');
    expect(screen.getByRole('table', { name: 'Line items' })).toBeTruthy();
  });

  it('as a form, submits its values once the browser has checked them', () => {
    const onSubmit = vi.fn();
    render(
      <Document label="Form" lifecycle="filled" onSubmit={onSubmit} formId="w4" defaultValues={{ first_name: 'Maya' }}>
        <DocumentField name="first_name" label="First name" required />
        <button type="submit">Submit</button>
      </Document>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith({ first_name: 'Maya' });
    expect(document.getElementById('w4')?.tagName).toBe('FORM');
  });
});
