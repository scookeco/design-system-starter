// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clause, Document, DocumentSection, Exhibit, Recital, Recitals, Step, Text, Toc, Xref } from '../../src/index';

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  errors.mockRestore();
});

const numbers = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('.clause__number')].map((n) => n.dataset.number);

describe('numbering contract (what Clause.css counts)', () => {
  it('an unnumbered clause takes no number and the next one does not skip', () => {
    const { container } = render(
      <Document label="Agreement">
        <Clause id="a" title="One">
          <Text>One.</Text>
        </Clause>
        <Clause id="note" title="Interpretation" numbered={false}>
          <Text>Headings are for convenience.</Text>
        </Clause>
        <Clause id="b" title="Two">
          <Text>
            See <Xref to="note" />.
          </Text>
        </Clause>
      </Document>,
    );
    expect(numbers(container)).toEqual(['1.', '2.']);
    expect(container.querySelector('[data-clause="note"]')?.getAttribute('data-unnumbered')).toBe('true');
    expect(screen.getByRole('link', { name: 'Interpretation' })).toBeTruthy();
  });

  it('a hidden clause takes no number, as display: none takes no counter', async () => {
    const { container, rerender } = render(
      <Document label="Agreement">
        <div>
          <Clause id="a" title="One">
            <Text>One.</Text>
          </Clause>
        </div>
        <Clause id="b" title="Two">
          <Text>
            <Xref to="b" />
          </Text>
        </Clause>
      </Document>,
    );
    expect(screen.getByRole('link', { name: 'Section\u00a02' })).toBeTruthy();
    rerender(
      <Document label="Agreement">
        <div hidden>
          <Clause id="a" title="One">
            <Text>One.</Text>
          </Clause>
        </div>
        <Clause id="b" title="Two">
          <Text>
            <Xref to="b" />
          </Text>
        </Clause>
      </Document>,
    );
    await waitFor(() => expect(screen.getByRole('link', { name: 'Section\u00a01' })).toBeTruthy());
    expect(numbers(container).at(-1)).toBe('1.');
  });

  it('every clause is a section, titled or not', () => {
    const { container } = render(
      <Document label="Agreement">
        <Clause id="a">
          <Text>Untitled.</Text>
        </Clause>
      </Document>,
    );
    expect(container.querySelector('[data-clause="a"]')?.tagName).toBe('SECTION');
  });
});

describe('Exhibit label', () => {
  it('replaces the letter, in the heading and in references', () => {
    const { container } = render(
      <Document label="Agreement">
        <Text>
          <Xref to="sow" />
        </Text>
        <Exhibit id="sow" title="Statement of Work" label="SOW-2">
          <Text>Work.</Text>
        </Exhibit>
      </Document>,
    );
    expect(container.querySelector('.exhibit__letter')?.textContent).toBe('Exhibit\u00a0SOW-2');
    expect(screen.getByRole('link', { name: 'Exhibit\u00a0SOW-2' })).toBeTruthy();
  });
});

describe('DocumentSection', () => {
  it('is an unnumbered section whose clauses number as if it were not there', () => {
    const { container } = render(
      <Document label="Handbook" headingLevel={2}>
        <DocumentSection id="leave" title="Leave">
          <Clause id="vacation" title="Vacation">
            <Text>Twenty days.</Text>
          </Clause>
        </DocumentSection>
        <Text>
          See <Xref to="leave" />.
        </Text>
      </Document>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Leave' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Vacation' })).toBeTruthy();
    expect(numbers(container)).toEqual(['1.']);
    expect(container.querySelector('[data-doc="section"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Leave' })).toBeTruthy();
  });

  it('numbered, it is a clause', () => {
    const { container } = render(
      <Document label="Policy">
        <DocumentSection id="scope" title="Scope" numbered>
          <Text>All staff.</Text>
        </DocumentSection>
      </Document>,
    );
    expect(numbers(container)).toEqual(['1.']);
  });
});

describe('Step', () => {
  it('numbers itself, takes a fixed number from the form, and says when it is optional', () => {
    const { container } = render(
      <Document label="W-4" shell="grid">
        <Step title="Enter personal information" area={{ row: 2, column: 1, columnSpan: 12 }} />
        <Step title="Sign here" n={5} optional />
      </Document>,
    );
    const steps = [...container.querySelectorAll<HTMLElement>('[data-doc="step"]')];
    expect(steps[0]?.style.gridArea).toBe('2 / 1 / span 1 / span 12');
    expect(steps[1]?.style.counterSet).toBe('step 5');
    expect(steps[1]?.dataset.n).toBe('5');
    expect(screen.getByRole('heading', { name: /^Sign here ?\(optional\)$/ })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Enter personal information' })).toBeTruthy();
  });
});

describe('Recitals', () => {
  it('letters recitals by a counter; WHEREAS and the closing are opt-in', () => {
    const { container } = render(
      <Document label="Agreement">
        <Recitals>
          <Recital>Customer wishes to obtain services.</Recital>
        </Recitals>
      </Document>,
    );
    expect(container.querySelector('.recital')?.textContent).toBe('Customer wishes to obtain services.');
    expect(container.textContent).not.toContain('NOW, THEREFORE');
  });
});

describe('Toc', () => {
  it('lists the outline as it is now, and links to each entry', async () => {
    function Msa({ fees }: { fees: boolean }) {
      return (
        <Document label="Agreement">
          <Toc />
          {fees ? (
            <Clause id="fees" title="Fees">
              <Clause id="invoices" title="Invoices">
                <Clause id="deep" title="Too deep">
                  <Text>Not listed at depth 2.</Text>
                </Clause>
              </Clause>
            </Clause>
          ) : null}
          <Clause id="term" title="Term">
            <Text>Two years.</Text>
          </Clause>
          <Exhibit id="dpa" title="Data Processing Agreement">
            <Clause id="roles" title="Roles">
              <Text>Controller.</Text>
            </Clause>
          </Exhibit>
        </Document>
      );
    }
    const { rerender } = render(<Msa fees />);
    const nav = screen.getByRole('navigation', { name: 'Contents' });
    await waitFor(() => expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['1. Fees', '1.1 Invoices', '2. Term', 'Exhibit\u00a0A Data Processing Agreement', '1. Roles']));
    fireEvent.click(within(nav).getByRole('link', { name: '2. Term' }));
    expect(document.activeElement?.getAttribute('data-clause')).toBe('term');
    rerender(<Msa fees={false} />);
    await waitFor(() => expect(within(nav).getAllByRole('link')[0]?.textContent).toBe('1. Term'));
  });
});
