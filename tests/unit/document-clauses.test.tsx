// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clause, Definition, Definitions, Document, DocumentViewer, Term, Text, Xref } from '../../src/index';

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  errors.mockRestore();
});

function Msa({ withFees = true }: { withFees?: boolean }) {
  return (
    <DocumentViewer>
      <Document label="Master services agreement">
        <Clause id="definitions" title="Definitions">
          <Text>
            <Term>Confidential Information</Term> means non-public information a party discloses.
          </Text>
        </Clause>
        {withFees ? (
          <Clause id="fees" title="Fees">
            <Text>Fees are due net 30.</Text>
          </Clause>
        ) : null}
        <Clause id="term" title="Term and termination">
          <Clause id="term-initial" title="Initial term">
            <Text>Twenty-four months.</Text>
          </Clause>
          <Clause id="term-end" title="Ending it">
            <Clause id="breach">
              <Text>for material breach;</Text>
            </Clause>
            <Clause id="insolvency">
              <Text>
                on insolvency, subject to <Xref to="breach" /> and the <Xref to="def-confidential-information" /> survives.
              </Text>
            </Clause>
          </Clause>
        </Clause>
      </Document>
    </DocumentViewer>
  );
}

/** The numbers the index computed: CSS draws them (Clause.css), and tests/visual/document-numbering.spec.ts checks the two agree. */
const numbers = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.clause__number')].map((n) => n.dataset.number);

describe('Clause', () => {
  it('numbers clauses from where they are: 1., 1.1, (a)', () => {
    const { container } = render(<Msa />);
    expect(numbers(container)).toEqual(['1.', '2.', '3.', '3.1', '3.2', '(a)', '(b)']);
    expect(screen.getByRole('heading', { level: 2, name: 'Term and termination' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Initial term' })).toBeTruthy();
    expect([...container.querySelectorAll<HTMLElement>('.clause__number')].map((n) => n.dataset.depth)).toEqual(['1', '1', '1', '2', '2', '3', '3']);
  });

  it('renumbers the document and its references when a clause is removed', async () => {
    const { container, rerender } = render(<Msa />);
    expect(screen.getByRole('link', { name: 'Section\u00a03.2(a)' })).toBeTruthy();
    rerender(<Msa withFees={false} />);
    await waitFor(() => expect(numbers(container)).toEqual(['1.', '2.', '2.1', '2.2', '(a)', '(b)']));
    expect(screen.getByRole('link', { name: 'Section\u00a02.2(a)' })).toBeTruthy();
  });

  it('scopes ids to the document, so two documents on a page never share one', () => {
    const { container } = render(
      <>
        <Msa />
        <Msa />
      </>,
    );
    const ids = [...container.querySelectorAll('[data-clause="fees"]')].map((el) => el.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('flags two clauses with one id', () => {
    const { container } = render(
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="fees" title="Fees">
            <Text>One.</Text>
          </Clause>
          <Clause id="fees" title="Fees again">
            <Text>Two.</Text>
          </Clause>
        </Document>
      </DocumentViewer>,
    );
    expect(container.querySelectorAll('.clause[data-duplicate]')).toHaveLength(2);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('"fees"'));
  });
});

describe('Xref', () => {
  it('links to the clause and moves focus there', () => {
    render(<Msa />);
    const link = screen.getByRole('link', { name: 'Section\u00a03.2(a)' });
    fireEvent.click(link);
    expect(document.activeElement?.getAttribute('data-clause')).toBe('breach');
    expect(link.getAttribute('href')).toBe(`#${document.activeElement?.id}`);
  });

  it('marks and reports a reference to a clause the document does not have', () => {
    const { container } = render(
      <DocumentViewer>
        <Document label="Agreement">
          <Text>
            See <Xref to="warranty" />.
          </Text>
        </Document>
      </DocumentViewer>,
    );
    const ref = container.querySelector('.xref');
    expect(ref?.getAttribute('data-broken')).toBe('true');
    expect(ref?.textContent).toBe('Section\u00a0[warranty?]');
    expect(screen.queryByRole('link')).toBeNull();
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('nothing in this document has the id "warranty"'));
  });

  it('takes another word before the number', () => {
    render(<Msa />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
    cleanup();
    render(
      <DocumentViewer>
        <Document label="Agreement">
          <Clause id="fees" title="Fees">
            <Text>
              As in <Xref to="fees" prefix="clause" />.
            </Text>
          </Clause>
        </Document>
      </DocumentViewer>,
    );
    expect(screen.getByRole('link', { name: 'clause\u00a01' })).toBeTruthy();
  });
});

describe('Term, Definitions and Xref to a term', () => {
  it('defines a term in running text, in quotes and bold; a reference reads as the term and links to it', () => {
    const { container } = render(<Msa />);
    const dfn = container.querySelector('dfn');
    expect(dfn?.textContent).toBe('Confidential Information');
    expect(dfn?.dataset.term).toBe('def-confidential-information');
    expect(dfn?.parentElement?.textContent).toContain('“Confidential Information”');
    const link = screen.getByRole('link', { name: 'Confidential Information' });
    expect(link.getAttribute('href')).toBe(`#${dfn?.id ?? ''}`);
    expect(errors).not.toHaveBeenCalled();
  });

  it('a reference can say the term as the sentence needs it', () => {
    render(
      <Document label="Agreement">
        <Text>
          <Term>Customer</Term> pays. <Xref to="def-customer">Customer’s</Xref> invoices.
        </Text>
      </Document>,
    );
    expect(screen.getByRole('link', { name: 'Customer’s' })).toBeTruthy();
  });

  it('lists definitions, each a term references link to', () => {
    const { container } = render(
      <Document label="Agreement">
        <Definitions>
          <Definition term="Services">The services in each order form.</Definition>
          <Definition term="Effective Date" id="effective">
            The date of the last signature.
          </Definition>
        </Definitions>
        <Text>
          The <Xref to="def-services" /> start on the <Xref to="effective" />.
        </Text>
      </Document>,
    );
    expect(container.querySelector('dl[data-doc="definitions"]')).toBeTruthy();
    expect([...container.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['Services', 'Effective Date']);
    expect(screen.getByRole('link', { name: 'Effective Date' }).getAttribute('href')).toBe(`#${container.querySelectorAll('dt')[1]?.id ?? ''}`);
  });

  it('marks a reference to an undefined term, and a term defined twice', () => {
    const { container } = render(
      <DocumentViewer>
        <Document label="Agreement">
          <Text>
            The <Xref to="def-services" /> and the <Term>Fees</Term> and the <Term>Fees</Term>; the <Xref to="def-fees">Fees’</Xref> due date.
          </Text>
        </Document>
      </DocumentViewer>,
    );
    expect(container.querySelector('.xref[data-broken]')?.textContent).toBe('Section\u00a0[def-services?]');
    expect(screen.getByRole('link', { name: 'Fees’' })).toBeTruthy();
    expect(container.querySelectorAll('dfn[data-duplicate]')).toHaveLength(2);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('"def-services"'));
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('"def-fees" is defined more than once'));
  });
});
