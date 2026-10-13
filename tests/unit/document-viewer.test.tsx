// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Document, DocumentViewer, Highlight, Text } from '../../src/index';

afterEach(cleanup);

describe('DocumentViewer highlights', () => {
  it('shows every tone together, each as a mark with its tone', () => {
    const { container } = render(
      <DocumentViewer>
        <Document label="Agreement">
          <Text>
            <Highlight>mine</Highlight> <Highlight tone="search">found</Highlight> <Highlight tone="ai">cited</Highlight>
          </Text>
        </Document>
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

  it('keeps a selection inside the document as a highlight, with H', () => {
    const onHighlight = vi.fn();
    render(
      <DocumentViewer onHighlight={onHighlight}>
        <Document label="Agreement">
          <Text>The agreement automatically renews every year.</Text>
        </Document>
      </DocumentViewer>,
    );
    expect(screen.queryByRole('button', { name: 'Highlight' })).toBeNull();
    const text = screen.getByText('The agreement automatically renews every year.').firstChild as Node;
    const range = document.createRange();
    range.setStart(text, 14);
    range.setEnd(text, 34);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });
    fireEvent.keyDown(document.body, { key: 'h' });
    expect(onHighlight).toHaveBeenCalledWith(expect.objectContaining({ text: 'automatically renews' }));
  });

  it('ignores a selection outside the document', () => {
    const onHighlight = vi.fn();
    render(
      <>
        <p>Outside text</p>
        <DocumentViewer onHighlight={onHighlight}>
          <Document label="Agreement">
            <Text>Inside text</Text>
          </Document>
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
    fireEvent.keyDown(document.body, { key: 'h' });
    expect(onHighlight).not.toHaveBeenCalled();
  });
});
