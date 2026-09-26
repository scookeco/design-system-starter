// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseBlocks, safeHref } from '../../src/components/Markdown/Markdown';
import { diffWords } from '../../src/components/ReviewChanges/ReviewChanges';
import { lastBoundary } from '../../src/components/StreamingText/StreamingText';
import { Citation, Composer, ReviewChanges, SourcesList, StreamingText, Suggestion } from '../../src/index';

afterEach(cleanup);

describe('Markdown (model output is untrusted)', () => {
  it('renders raw HTML as text and never creates script, img or event handlers', () => {
    const { container } = render(<StreamingText text={'<script>alert(1)</script> <img src=x onerror="alert(1)"> ![p](https://t.example/p.gif)'} />);
    expect(container.querySelector('script, img, [onerror]')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('links only http(s), mailto, same-page and app-relative URLs', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('/records/r-1')).toBe('/records/r-1');
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('JavaScript:alert(1)')).toBeUndefined();
    expect(safeHref('data:text/html,x')).toBeUndefined();
    expect(safeHref('//evil.example')).toBeUndefined();
    const { container } = render(<StreamingText text="[ok](https://example.com) and [bad](javascript:alert(1))" />);
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('https://example.com');
    expect(container.textContent).toContain('bad');
  });

  it('renders partial input sensibly: an open fence is code so far, an unmatched marker is text', () => {
    expect(parseBlocks('Run:\n```bash\nnpm ci')).toEqual([
      { kind: 'paragraph', text: 'Run:' },
      { kind: 'code', language: 'bash', code: 'npm ci' },
    ]);
    const { container } = render(<StreamingText text="It is **impor" status="streaming" />);
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toContain('**impor');
    const half = render(<StreamingText text="Renews in January [1" status="streaming" />);
    expect(half.container.textContent).toContain('[1');
  });

  it('demotes headings to bold text, so an answer can’t change the page outline', () => {
    const { container } = render(<StreamingText text={'# Title\n\nBody'} />);
    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('Title');
  });
});

describe('StreamingText announcements', () => {
  const region = () => screen.getByRole('status');

  it('finds sentence and paragraph boundaries, not decimals', () => {
    expect(lastBoundary('Costs 3.5 million', 0)).toBe(-1);
    expect(lastBoundary('Done. Next', 0)).toBe(5);
    expect(lastBoundary('One\n\nTwo', 0)).toBe(5);
  });

  it('announces Generating, then each complete sentence once, never per token, and never the whole answer at the end', () => {
    const { rerender } = render(<StreamingText text="" status="pending" />);
    expect(region().textContent).toBe('Generating…');
    const heard: string[] = [];
    const tokens = ['It ', 'renews ', 'in ', 'January. ', 'Either ', 'side ', 'can ', 'cancel.'];
    let text = '';
    for (const token of tokens) {
      text += token;
      rerender(<StreamingText text={text} status="streaming" />);
      if (heard.at(-1) !== region().textContent) heard.push(region().textContent ?? '');
    }
    rerender(<StreamingText text={text} status="complete" />);
    if (heard.at(-1) !== region().textContent) heard.push(region().textContent ?? '');
    expect(heard).toEqual(['Generating…', 'It renews in January.', 'Either side can cancel.']);
  });

  it('says Stopped when the person stops it, and says nothing for history', () => {
    const { rerender } = render(<StreamingText text="It renews" status="streaming" />);
    rerender(<StreamingText text="It renews" status="stopped" />);
    expect(region().textContent).toBe('Stopped.');
    cleanup();
    render(<StreamingText text="An old answer. From history." status="complete" />);
    expect(region().textContent).toBe('');
  });
});

describe('Citation', () => {
  it('is a named link that moves focus to its source and marks it current', () => {
    function Answer() {
      const [active, setActive] = useState<number>();
      return (
        <>
          <p>
            Renews in January
            <Citation number={1} sources="s" title="Renews on" onActivate={setActive} />
          </p>
          <SourcesList id="s" sources={[{ title: 'Renews on', origin: 'Record field' }]} active={active} />
        </>
      );
    }
    render(<Answer />);
    fireEvent.click(screen.getByRole('link', { name: 'Source 1: Renews on' }));
    const source = document.getElementById('s-1');
    expect(document.activeElement).toBe(source);
    expect(source?.getAttribute('aria-current')).toBe('true');
  });
});

describe('Composer', () => {
  it('sends on Enter, adds a line on Shift+Enter, and never sends mid-composition', () => {
    const onSend = vi.fn();
    render(<Composer label="Ask" onSend={onSend} defaultValue="Hello" />);
    const box = screen.getByRole('textbox', { name: 'Ask' });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Hello');
    expect((box as HTMLTextAreaElement).value).toBe('');
  });

  it('shows Stop instead of Send while streaming, and Enter doesn’t send', () => {
    const onSend = vi.fn();
    const onStop = vi.fn();
    render(<Composer label="Ask" onSend={onSend} onStop={onStop} streaming defaultValue="Next question" />);
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Ask' }), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('disables Send over the limit and says by how much', () => {
    render(<Composer label="Ask" onSend={() => undefined} maxLength={5} defaultValue="Too long" />);
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('3 characters over the limit')).toBeTruthy();
  });
});

describe('Suggestion', () => {
  function Field({ onAccept = () => undefined, pending = false }: { onAccept?: () => void; pending?: boolean }) {
    const [value, setValue] = useState('Covers');
    const [suggestion, setSuggestion] = useState<string | undefined>(' cleaning.');
    return (
      <Suggestion
        label="Description"
        value={value}
        onValueChange={setValue}
        suggestion={suggestion}
        pending={pending}
        onAccept={() => {
          onAccept();
          setValue(value + (suggestion ?? ''));
          setSuggestion(undefined);
        }}
        onDismiss={() => setSuggestion(undefined)}
      />
    );
  }

  it('keeps the suggestion out of the value until Tab accepts it', () => {
    render(<Field />);
    const box = screen.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement;
    expect(box.value).toBe('Covers');
    expect(screen.getByRole('status').textContent).toBe('Suggestion ready. Press Tab to accept or Escape to dismiss.');
    fireEvent.keyDown(box, { key: 'Tab' });
    expect(box.value).toBe('Covers cleaning.');
  });

  it('dismisses on Escape and on typing over it; Tab can’t accept a suggestion still arriving', () => {
    const onAccept = vi.fn();
    const { unmount } = render(<Field pending onAccept={onAccept} />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Description' }), { key: 'Tab' });
    expect(onAccept).not.toHaveBeenCalled();
    unmount();
    render(<Field />);
    const box = screen.getByRole('textbox', { name: 'Description' });
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    cleanup();
    render(<Field />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), { target: { value: 'Covers x' } });
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });
});

describe('ReviewChanges', () => {
  const changes = [
    { id: 'a', target: 'One', field: 'Status', before: 'Overdue', after: 'Pending' },
    { id: 'b', target: 'Two', field: 'Status', before: 'Overdue', after: 'Active' },
    { id: 'c', target: 'Three', field: 'Status', before: 'Archived', after: 'Pending', blockedReason: 'it’s archived.' },
  ];

  it('diffs text word by word', () => {
    expect(diffWords('Renews each year.', 'Renews each January.')).toEqual([
      { text: 'Renews each ', op: 'same' },
      { text: 'year.', op: 'removed' },
      { text: 'January.', op: 'added' },
    ]);
  });

  it('applies only accepted changes, never blocked ones, and offers Undo once applied', () => {
    const onApply = vi.fn();
    const { rerender } = render(<ReviewChanges title="Proposed" changes={changes} onApply={onApply} />);
    const apply = () => screen.getByRole('button', { name: /^Apply/ });
    expect((apply() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(screen.getByRole('group', { name: 'Status of One' })).getByRole('button', { name: 'Accept' }));
    fireEvent.click(apply());
    expect(onApply).toHaveBeenCalledWith(['a']);
    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    fireEvent.click(apply());
    expect(onApply).toHaveBeenLastCalledWith(['a', 'b']);
    const onUndo = vi.fn();
    rerender(<ReviewChanges title="Proposed" changes={changes} onApply={onApply} onUndo={onUndo} outcomes={{ a: { ok: true }, b: { ok: false, reason: 'conflict' } }} />);
    expect(screen.getByText('1 applied, 1 not applied.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalled();
  });
});
