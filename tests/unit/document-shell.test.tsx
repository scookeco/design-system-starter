// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { areaStyle } from '../../src/components/Document/Document';
import { Clause, Xref, Document, DocumentFlow, DocumentGrid, DocumentPage, Text } from '../../src/index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Document shell', () => {
  it('is one article named by its label, carrying type, version, lifecycle and shell', () => {
    render(
      <Document label="Master services agreement" type="msa" version="3.2" lifecycle="negotiated" lang="en">
        <Text>Body</Text>
      </Document>,
    );
    const root = screen.getByRole('article', { name: 'Master services agreement' });
    expect(root.dataset).toMatchObject({ doc: 'document', type: 'msa', version: '3.2', lifecycle: 'negotiated', shell: 'flow' });
    expect(root.getAttribute('lang')).toBe('en');
  });

  it('defaults to a generated flow document', () => {
    render(<Document label="Letter">{null}</Document>);
    expect(screen.getByRole('article').dataset).toMatchObject({ lifecycle: 'generated', shell: 'flow' });
  });

  it('numbers clauses and resolves references without a viewer', () => {
    render(
      <Document label="Agreement">
        <DocumentFlow>
          <Clause id="term" title="Term">
            <Text>
              See <Xref to="end" />.
            </Text>
          </Clause>
          <Clause id="end" title="Termination">
            <Text>Notice.</Text>
          </Clause>
        </DocumentFlow>
      </Document>,
    );
    expect(screen.getByRole('link', { name: 'Section\u00a02' })).toBeTruthy();
  });

  it('reports a Document inside a Document', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <Document label="Outer">
        <Document label="Inner">{null}</Document>
      </Document>,
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining('"Inner" is inside another Document'));
  });

  it('marks pages with the document’s shell, size, orientation and number', () => {
    const { container } = render(
      <Document label="W-4" shell="grid">
        <DocumentPage n={1} orientation="landscape">
          <DocumentGrid cols={12} rows={24}>
            <Text>Step 1</Text>
          </DocumentGrid>
        </DocumentPage>
      </Document>,
    );
    const page = container.querySelector<HTMLElement>('[data-doc="page"]');
    expect(page?.dataset).toMatchObject({ shell: 'grid', size: 'letter', orientation: 'landscape', n: '1' });
    const grid = container.querySelector<HTMLElement>('[data-doc="grid"]');
    expect(grid?.style.gridTemplateColumns).toBe('repeat(12, minmax(0, 1fr))');
    expect(grid?.style.gridTemplateRows).toBe('repeat(24, var(--size-document-grid-row))');
  });

  it('a page in a flow document is a flow page', () => {
    const { container } = render(
      <Document label="MSA">
        <DocumentPage>{null}</DocumentPage>
      </Document>,
    );
    expect(container.querySelector<HTMLElement>('[data-doc="page"]')?.dataset.shell).toBe('flow');
  });

  it('places an area by 1-based grid lines and spans', () => {
    expect(areaStyle({ row: 3, column: 1, columnSpan: 5 })).toEqual({ gridArea: '3 / 1 / span 1 / span 5' });
    expect(areaStyle(undefined)).toBeUndefined();
  });
});
