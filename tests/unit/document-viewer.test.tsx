// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataField, DocumentField, DocumentViewer, Highlight, Text } from '../../src/index';

afterEach(cleanup);

const maya = { name: 'Maya Okafor', category: 1 } as const;
const jon = { name: 'Jon Park', category: 3 } as const;

describe('DocumentViewer highlights', () => {
  it('shows only the current layer as marks; the others read as plain text', () => {
    const { container } = render(
      <DocumentViewer label="Agreement" defaultLayer="search">
        <Text>
          <Highlight tone="yours">mine</Highlight> <Highlight tone="search" current>found</Highlight> <Highlight tone="ai">cited</Highlight>
        </Text>
      </DocumentViewer>,
    );
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('found');
    expect(marks[0]?.getAttribute('aria-current')).toBe('true');
    expect(container.textContent).toContain('mine');
  });

  it('switching the layer changes which highlights show', () => {
    const { container } = render(
      <DocumentViewer label="Agreement">
        <Text>
          <Highlight tone="yours">mine</Highlight> <Highlight tone="ai">cited</Highlight>
        </Text>
      </DocumentViewer>,
    );
    expect(container.querySelector('mark')?.textContent).toBe('mine');
    fireEvent.click(screen.getByRole('radio', { name: 'AI' }));
    expect(container.querySelector('mark')?.textContent).toBe('cited');
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

describe('DocumentField', () => {
  it('names a field by what it asks, whether it is required, and whose it is', () => {
    render(<DocumentField kind="signature" label="Sign" signer={maya} required />);
    expect(screen.getByRole('button', { name: 'Sign, required, Maya Okafor' })).toBeTruthy();
  });

  it('shows the value once filled, and says so', () => {
    render(<DocumentField kind="select" label="Invoice frequency" signer={maya} value="Quarterly" />);
    expect(screen.getByRole('button', { name: 'Invoice frequency, Quarterly, Maya Okafor' }).textContent).toBe('Quarterly');
  });

  it('another signer’s field is not focusable and says whose it is', () => {
    const { container } = render(<DocumentField kind="signature" label="Sign" signer={jon} yours={false} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[data-signer="other"]')?.getAttribute('aria-label')).toBe('Sign, Jon Park’s field');
  });

  it('opens its editor in a popover and runs onActivate when it has none', () => {
    const onActivate = vi.fn();
    render(
      <>
        <DocumentField kind="text" label="Site contact" signer={maya} editor={<input aria-label="Site contact value" />} />
        <DocumentField kind="signature" label="Sign" signer={maya} onActivate={onActivate} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Site contact, empty, Maya Okafor' }));
    expect(screen.getByRole('textbox', { name: 'Site contact value' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sign, empty, Maya Okafor' }));
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('marks an invalid field for assistive technology', () => {
    render(<DocumentField kind="number" label="Seats" signer={maya} required invalid />);
    expect(screen.getByRole('button', { name: 'Seats, required, Maya Okafor' }).getAttribute('aria-invalid')).toBe('true');
  });
});
