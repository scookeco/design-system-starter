// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clause, ClauseRef, DocumentViewer, Term, Text } from '../../src/index';

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
    <DocumentViewer label="Master services agreement">
      <Clause id="definitions" title="Definitions">
        <Text>
          <Term define>Confidential Information</Term> means non-public information a party discloses.
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
              on insolvency, subject to <ClauseRef to="breach" /> and the <Term>confidential information</Term> survives.
            </Text>
          </Clause>
        </Clause>
      </Clause>
    </DocumentViewer>
  );
}

const numbers = (container: HTMLElement) => [...container.querySelectorAll('.clause__number')].map((n) => n.textContent);

describe('Clause', () => {
  it('numbers clauses from where they are: 1., 1.1, (a)', () => {
    const { container } = render(<Msa />);
    expect(numbers(container)).toEqual(['1.', '2.', '3.', '3.1', '3.2', '(a)', '(b)']);
    expect(screen.getByRole('heading', { level: 2, name: '3.Term and termination' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: '3.1Initial term' })).toBeTruthy();
  });

  it('renumbers the document and its references when a clause is removed', async () => {
    const { container, rerender } = render(<Msa />);
    expect(screen.getByRole('link', { name: 'Section 3.2(a)' })).toBeTruthy();
    rerender(<Msa withFees={false} />);
    await waitFor(() => expect(numbers(container)).toEqual(['1.', '2.', '2.1', '2.2', '(a)', '(b)']));
    expect(screen.getByRole('link', { name: 'Section 2.2(a)' })).toBeTruthy();
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
      <DocumentViewer label="Agreement">
        <Clause id="fees" title="Fees">
          <Text>One.</Text>
        </Clause>
        <Clause id="fees" title="Fees again">
          <Text>Two.</Text>
        </Clause>
      </DocumentViewer>,
    );
    expect(container.querySelectorAll('.clause[data-duplicate]')).toHaveLength(2);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('"fees"'));
  });
});

describe('ClauseRef', () => {
  it('links to the clause and moves focus there', () => {
    render(<Msa />);
    const link = screen.getByRole('link', { name: 'Section 3.2(a)' });
    fireEvent.click(link);
    expect(document.activeElement?.getAttribute('data-clause')).toBe('breach');
    expect(link.getAttribute('href')).toBe(`#${document.activeElement?.id}`);
  });

  it('marks and reports a reference to a clause the document does not have', () => {
    const { container } = render(
      <DocumentViewer label="Agreement">
        <Text>
          See <ClauseRef to="warranty" />.
        </Text>
      </DocumentViewer>,
    );
    const ref = container.querySelector('.clause-ref');
    expect(ref?.getAttribute('data-unresolved')).toBe('true');
    expect(ref?.textContent).toBe('Section [warranty?]');
    expect(screen.queryByRole('link')).toBeNull();
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('no clause "warranty"'));
  });

  it('takes another word before the number', () => {
    render(<Msa />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    cleanup();
    render(
      <DocumentViewer label="Agreement">
        <Clause id="fees" title="Fees">
          <Text>
            As in <ClauseRef to="fees" prefix="clause" />.
          </Text>
        </Clause>
      </DocumentViewer>,
    );
    expect(screen.getByRole('link', { name: 'clause 1' })).toBeTruthy();
  });
});

describe('Term', () => {
  it('defines a term once, in quotes and bold, and matches uses whatever their case', () => {
    const { container } = render(<Msa />);
    const dfn = container.querySelector('dfn');
    expect(dfn?.textContent).toBe('Confidential Information');
    expect(dfn?.parentElement?.textContent).toContain('“Confidential Information”');
    expect(container.querySelector('[data-term-use]')?.hasAttribute('data-unresolved')).toBe(false);
    expect(errors).not.toHaveBeenCalled();
  });

  it('marks a term used but never defined, and one defined twice', () => {
    const { container } = render(
      <DocumentViewer label="Agreement">
        <Text>
          The <Term>Services</Term> and the <Term define>Fees</Term> and the <Term define>Fees</Term>; the{' '}
          <Term name="Fees">Fees’</Term> due date.
        </Text>
      </DocumentViewer>,
    );
    expect(container.querySelector('[data-term-use="services"]')?.getAttribute('data-unresolved')).toBe('true');
    expect(container.querySelector('[data-term-use="fees"]')?.hasAttribute('data-unresolved')).toBe(false);
    expect(container.querySelectorAll('dfn[data-duplicate]')).toHaveLength(2);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('"services" is used but never defined'));
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('"fees" is defined 2 times'));
  });
});
