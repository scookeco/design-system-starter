// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeBlock, CopyButton, Divider, FileUpload, Slider, Timeline, Toggle, type FileUploadItem } from '../../src/index';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// jsdom has no ResizeObserver; Radix Slider measures its thumbs with one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const file = (name: string, type: string, size: number) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('FileUpload', () => {
  const base = { label: 'Attachments', accept: ['.pdf', 'image/*'], acceptText: 'PDF or an image', maxSize: 1000, files: [] as FileUploadItem[] };

  it('shows the limits up front and describes the Choose files button with them', () => {
    render(<FileUpload {...base} onFilesAdded={() => undefined} onRemove={() => undefined} />);
    const button = screen.getByRole('button', { name: 'Choose files' });
    const described = (button.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['Attachments', 'PDF or an image, up to 1000 B each.']);
    expect(screen.getByRole('group', { name: 'Attachments' })).toBeTruthy();
  });

  it('checks type and size, hands back accepted files and rejections, and announces the result', () => {
    const onFilesAdded = vi.fn();
    const { container } = render(<FileUpload {...base} onFilesAdded={onFilesAdded} onRemove={() => undefined} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const ok = file('a.pdf', 'application/pdf', 10);
    const wrongType = file('b.dwg', 'application/octet-stream', 10);
    const tooBig = file('c.png', 'image/png', 5000);
    fireEvent.change(input, { target: { files: [ok, wrongType, tooBig] } });
    const [accepted, rejected] = onFilesAdded.mock.calls[0] as [File[], { file: File; reason: string }[]];
    expect(accepted).toEqual([ok]);
    expect(rejected.map((r) => [r.file.name, r.reason])).toEqual([
      ['b.dwg', 'type'],
      ['c.png', 'size'],
    ]);
    expect(screen.getByRole('status').textContent).toBe('1 file added, 2 files not added');
  });

  it('accepts drops the same way, as an enhancement of the button', () => {
    const onFilesAdded = vi.fn();
    const { container } = render(<FileUpload {...base} onFilesAdded={onFilesAdded} onRemove={() => undefined} />);
    const zone = container.querySelector('[data-drag-alternative]') as HTMLElement;
    fireEvent.drop(zone, { dataTransfer: { files: [file('a.pdf', 'application/pdf', 10)] } });
    expect((onFilesAdded.mock.calls[0] as [File[]])[0]).toHaveLength(1);
  });

  it('names each remove button by its file and moves focus on after a removal', () => {
    const files = [
      { id: '1', name: 'one.pdf', size: 10 },
      { id: '2', name: 'two.pdf', size: 10, progress: 50 },
    ];
    const { rerender } = render(<FileUpload {...base} files={files} onFilesAdded={() => undefined} onRemove={() => undefined} />);
    expect(screen.getByRole('progressbar', { name: 'two.pdf' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove one.pdf' }));
    rerender(<FileUpload {...base} files={files.slice(1)} onFilesAdded={() => undefined} onRemove={() => undefined} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel two.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel two.pdf' }));
    rerender(<FileUpload {...base} files={[]} onFilesAdded={() => undefined} onRemove={() => undefined} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose files' }));
  });
});

describe('Slider', () => {
  it('names a single thumb by the label and says its value in words', () => {
    render(<Slider label="Volume" defaultValue={[40]} formatValue={(v) => `${String(v)}%`} />);
    const thumb = screen.getByRole('slider', { name: 'Volume' });
    expect(thumb.getAttribute('aria-valuetext')).toBe('40%');
  });

  it('names each thumb of a range', () => {
    render(<Slider label="Price" defaultValue={[20, 80]} />);
    expect(screen.getByRole('slider', { name: 'Price, minimum' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Price, maximum' })).toBeTruthy();
  });
});

describe('CopyButton', () => {
  it('copies, announces “Copied” in a live region present from mount, and reverts', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CopyButton text="abc" accessibleName="Copy API key" revertAfter={1000} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy API key' }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith('abc');
    expect(status.textContent).toBe('Copied');
    act(() => vi.advanceTimersByTime(1000));
    expect(status.textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
  });

  it('says so when the clipboard is refused', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    render(<CopyButton text="abc" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('status').textContent).toMatch(/Couldn’t copy/);
  });
});

describe('CodeBlock', () => {
  it('is a named, focusable region with a copy button named after it', () => {
    render(<CodeBlock label="Install command" code={'\nnpm i\n'} />);
    const region = screen.getByRole('region', { name: 'Install command' });
    expect(region.tabIndex).toBe(0);
    expect(region.textContent).toBe('npm i');
    expect(screen.getByRole('button', { name: 'Copy install command' })).toBeTruthy();
  });
});

describe('Timeline, Divider and Toggle', () => {
  it('Timeline is a named ordered list of sentences with machine-readable times', () => {
    render(<Timeline label="Activity" events={[{ id: '1', actor: 'Priya', verb: 'created the invoice', time: 'Yesterday', dateTime: '2026-03-01T10:00:00Z' }]} />);
    const list = screen.getByRole('list', { name: 'Activity' });
    expect(list.tagName).toBe('OL');
    expect(list.querySelector('time')?.getAttribute('datetime')).toBe('2026-03-01T10:00:00Z');
  });

  it('Divider is hidden unless it is semantic', () => {
    const { rerender } = render(<Divider />);
    expect(screen.queryByRole('separator')).toBeNull();
    rerender(<Divider decorative={false} orientation="vertical" />);
    expect(screen.getByRole('separator').getAttribute('aria-orientation')).toBe('vertical');
  });

  it('Toggle keeps its name and reports state with aria-pressed', () => {
    render(<Toggle label="Show archived" />);
    const toggle = screen.getByRole('button', { name: 'Show archived' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show archived' }).getAttribute('aria-pressed')).toBe('true');
  });
});
