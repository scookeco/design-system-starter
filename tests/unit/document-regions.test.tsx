// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Address,
  Callout,
  Clause,
  ClauseNote,
  Document,
  DocumentCell,
  DocumentFooter,
  DocumentGrid,
  DocumentHeader,
  DocumentList,
  DocumentListItem,
  DocumentPage,
  Figure,
  KeyValue,
  KeyValueItem,
  Letterhead,
  Seal,
  Text,
  Watermark,
} from '../../src/index';

afterEach(cleanup);

const root = () => document.documentElement.style;

describe('DocumentHeader and DocumentFooter', () => {
  it('hand their text to the page margins: rest skips the first page, all runs on both', () => {
    render(
      <Document label="MSA">
        <DocumentHeader pages="rest">MSA “v3” · Confidential</DocumentHeader>
        <DocumentFooter pageNumber="of">Acme</DocumentFooter>
      </Document>,
    );
    expect(root().getPropertyValue('--document-header-first')).toBe('');
    expect(root().getPropertyValue('--document-header-rest')).toBe('"MSA “v3” · Confidential"');
    const footer = '"Acme" "\\00a0·\\00a0" "Page " counter(page) " of " counter(pages)';
    expect(root().getPropertyValue('--document-footer-first')).toBe(footer);
    expect(root().getPropertyValue('--document-footer-rest')).toBe(footer);
    expect(screen.getByText('MSA “v3” · Confidential').dataset.pages).toBe('rest');
  });

  it('escape quotes, and clear their text when they leave', () => {
    const { unmount } = render(
      <Document label="Letter">
        <DocumentHeader pages="first">Say "hi"</DocumentHeader>
        <DocumentFooter pageNumber="page" />
      </Document>,
    );
    expect(root().getPropertyValue('--document-header-first')).toBe('"Say \\"hi\\""');
    expect(root().getPropertyValue('--document-footer-rest')).toBe('"" "Page " counter(page)');
    unmount();
    expect(root().getPropertyValue('--document-header-first')).toBe('');
    expect(root().getPropertyValue('--document-footer-rest')).toBe('');
  });
});

describe('Watermark', () => {
  it('shows until the document is executed, as an image named by its word', () => {
    const { rerender } = render(
      <Document label="MSA" lifecycle="negotiated">
        <Watermark />
      </Document>,
    );
    expect(screen.getByRole('img', { name: 'DRAFT' })).toBeTruthy();
    rerender(
      <Document label="MSA" lifecycle="executed">
        <Watermark />
      </Document>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    rerender(
      <Document label="MSA" lifecycle="executed">
        <Watermark text="COPY" when="true" />
      </Document>,
    );
    expect(screen.getByRole('img', { name: 'COPY' })).toBeTruthy();
  });
});

describe('Margin', () => {
  it('holds a clause’s note, right after its heading', () => {
    const { container } = render(
      <Document label="MSA">
        <Clause id="cap" title="Liability" note={<ClauseNote position="balanced" />}>
          <Text>Capped.</Text>
        </Clause>
      </Document>,
    );
    const margin = container.querySelector('aside[data-doc="margin"]');
    expect(margin?.getAttribute('data-side')).toBe('end');
    expect(margin?.previousElementSibling?.tagName).toBe('H2');
    expect(margin?.querySelector('[role="note"]')).toBeTruthy();
  });
});

describe('content', () => {
  it('a numbered list is ordered, a bulleted one is not', () => {
    const { container } = render(
      <>
        <DocumentList listStyle="lower-alpha">
          <DocumentListItem>a</DocumentListItem>
        </DocumentList>
        <DocumentList>
          <DocumentListItem>b</DocumentListItem>
        </DocumentList>
      </>,
    );
    expect([...container.querySelectorAll('[data-doc="list"]')].map((l) => l.tagName)).toEqual(['OL', 'UL']);
  });

  it('key-value pairs, an address, a callout, a figure and a seal use their native elements', () => {
    const { container } = render(
      <Document label="Invoice" shell="grid">
        <DocumentPage>
          <DocumentGrid>
            <Letterhead>
              <Text>Acme Corp</Text>
            </Letterhead>
            <KeyValue area={{ row: 1, column: 8, columnSpan: 5 }}>
              <KeyValueItem label="Total" emphasis>
                $10.00
              </KeyValueItem>
            </KeyValue>
            <Address label="Bill to" name="bill_to" lines={['Globex Inc.', '1 Main St']} />
            <Callout kind="warning">Pay by the due date.</Callout>
            <Figure caption="Figure 1.">
              <Text>Chart</Text>
            </Figure>
            <Seal issuer="State of Washington" src="data:," />
            <DocumentCell area={{ row: 9, column: 1, columnSpan: 12 }}>
              <Text>Thank you.</Text>
            </DocumentCell>
          </DocumentGrid>
        </DocumentPage>
      </Document>,
    );
    const dl = container.querySelector<HTMLElement>('dl[data-doc="kv"]');
    expect(dl?.style.gridArea).toBe('1 / 8 / span 1 / span 5');
    expect(dl?.querySelector('dt')?.textContent).toBe('Total');
    expect(container.querySelector('address[data-name="bill_to"]')?.textContent).toBe('Globex Inc.1 Main St');
    expect(container.querySelector('aside[data-kind="warning"]')?.textContent).toContain('Warning');
    expect(container.querySelector('figcaption')?.textContent).toBe('Figure 1.');
    expect(screen.getByRole('img', { name: 'Seal of State of Washington' })).toBeTruthy();
    expect(container.querySelector<HTMLElement>('[data-doc="cell"]')?.style.gridArea).toBe('9 / 1 / span 1 / span 12');
    expect(container.querySelector('header[data-doc="letterhead"]')).toBeTruthy();
  });
});
