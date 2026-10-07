// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataField, DocumentViewer, Highlight, Text } from '../../src/index';

afterEach(cleanup);

describe('DocumentViewer highlights', () => {
  it('shows every tone together, each as a mark with its tone', () => {
    const { container } = render(
      <DocumentViewer label="Agreement">
        <Text>
          <Highlight>mine</Highlight> <Highlight tone="search">found</Highlight> <Highlight tone="ai">cited</Highlight>
        </Text>
      </DocumentViewer>,
    );
    const marks = [...container.querySelectorAll('mark')];
    expect(marks.map((m) => m.textContent)).toEqual(['mine', 'found', 'cited']);
    expect(marks.map((m) => m.getAttribute('data-tone'))).toEqual([null, 'search', 'ai']);
  });

  it('a highlight works outside a viewer too', () => {
    const { container } = render(<Highlight id="cite-1" tone="ai">cited</Highlight>);
    const mark = container.querySelector('mark');
    expect(mark?.id).toBe('cite-1');
    expect(mark?.className).toBe('highlight-mark');
  });

  it('keeps a selection inside the document as a highlight, from the toolbar button', () => {
    const onHighlight = vi.fn();
    render(
      <DocumentViewer label="Agreement" onHighlight={onHighlight}>
        <Text>The agreement automatically renews every year.</Text>
      </DocumentViewer>,
    );
    const button = screen.getByRole('button', { name: 'Highlight' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    const text = screen.getByText('The agreement automatically renews every year.').firstChild as Node;
    const range = document.createRange();
    range.setStart(text, 14);
    range.setEnd(text, 34);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Highlight' }));
    expect(onHighlight).toHaveBeenCalledWith(expect.objectContaining({ text: 'automatically renews' }));
  });

  it('ignores a selection outside the document', () => {
    const onHighlight = vi.fn();
    render(
      <>
        <p>Outside text</p>
        <DocumentViewer label="Agreement" onHighlight={onHighlight}>
          <Text>Inside text</Text>
        </DocumentViewer>
      </>,
    );
    const range = document.createRange();
    range.selectNodeContents(screen.getByText('Outside text'));
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });
    expect((screen.getByRole('button', { name: 'Highlight' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('DataField', () => {
  it('is plain text when filled, blank when empty, and a placeholder when one is given', () => {
    const { container } = render(
      <Text>
        A <DataField value="Acme Corp" /> B <DataField value="" /> C <DataField placeholder="Signer’s name" />
      </Text>,
    );
    expect(container.textContent).toBe('A Acme Corp B  C Signer’s name');
    expect(container.querySelector('[data-state="placeholder"]')?.textContent).toBe('Signer’s name');
    expect(container.querySelectorAll('.document-data')).toHaveLength(2);
  });

  it('announces a placeholder that fills, once, in the live region', () => {
    function Filling() {
      const [value, setValue] = useState<string | undefined>();
      return (
        <DocumentViewer label="Agreement">
          <Text>
            Effective <DataField value={value} placeholder="when signed" announceAs="Effective date" />
          </Text>
          <button type="button" onClick={() => setValue('14 October 2026')}>
            Sign
          </button>
        </DocumentViewer>
      );
    }
    const { container } = render(<Filling />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Effective date filled: 14 October 2026');
    expect(container.querySelector('[data-state="filled-now"]')?.textContent).toBe('14 October 2026');
  });
});
