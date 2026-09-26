// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Combobox, DatePicker, InlineEdit, LocaleProvider, NumberField, SplitView, Toolbar, ToolbarButton } from '../../src/index';

afterEach(cleanup);

// jsdom lacks CSS.escape, which React Aria's listbox uses.
globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

describe('InlineEdit', () => {
  it('saves with Enter and returns focus to the value', async () => {
    const onSave = vi.fn();
    render(<InlineEdit label="Name" value="Northwind" onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Name: Northwind' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'Northwind renewal' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Northwind renewal'));
    await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Edit Name: Northwind'));
  });

  it('cancels with Escape, keeping the old value, and never saves', () => {
    const onSave = vi.fn();
    render(<InlineEdit label="Name" value="Northwind" onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Name: Northwind' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onSave).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Edit Name: Northwind' }));
  });

  it('keeps the draft and says what to fix, from validate or from the save', async () => {
    const onSave = vi.fn(async () => Promise.resolve('That name is taken.'));
    render(<InlineEdit label="Name" value="Northwind" onSave={onSave} validate={(v) => (v ? undefined : 'Enter a name.')} defaultEditing />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText('Enter a name.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Contoso' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText('That name is taken.')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Contoso');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('NumberField', () => {
  it('shows money from integer minor units and hands minor units back', () => {
    const onValueChange = vi.fn();
    render(<NumberField label="Amount" currency="USD" defaultValue={125050} onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect((input as HTMLInputElement).value).toBe('$1,250.50');
    fireEvent.change(input, { target: { value: '12.5' } });
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenLastCalledWith(1250);
  });

  it('parses the reader’s format, from LocaleProvider', () => {
    const onValueChange = vi.fn();
    render(
      <LocaleProvider locale="de-DE" timeZone="Europe/Berlin">
        <NumberField label="Menge" onValueChange={onValueChange} />
      </LocaleProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Menge' });
    fireEvent.change(input, { target: { value: '1.234,5' } });
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenLastCalledWith(1234.5);
  });
});

describe('DatePicker', () => {
  it('takes and gives ISO calendar dates, shown in the LocaleProvider’s order', () => {
    const onValueChange = vi.fn();
    render(
      <LocaleProvider locale="de-DE" timeZone="Europe/Berlin">
        <DatePicker label="Verlängert am" defaultValue="2026-10-14" onValueChange={onValueChange} />
      </LocaleProvider>,
    );
    const segments = screen.getAllByRole('spinbutton');
    expect(segments.map((s) => s.textContent)).toEqual(['14', '10', '2026']);
    act(() => segments[0]?.focus());
    fireEvent.keyDown(segments[0] as HTMLElement, { key: 'ArrowUp' });
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-15');
  });
});

describe('Combobox', () => {
  it('narrows as you type and chooses with the keyboard', async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="Owner"
        options={[
          { value: 'p01', label: 'Sam Rivera' },
          { value: 'p03', label: 'Jo Okafor' },
        ]}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Owner' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: 'oka' } });
    await waitFor(() => expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Jo Okafor']));
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onValueChange).toHaveBeenLastCalledWith('p03');
  });
});

describe('Toolbar', () => {
  it('is one tab stop: only the first control is tabbable', () => {
    render(
      <Toolbar label="Actions">
        <ToolbarButton>Archive</ToolbarButton>
        <ToolbarButton>Mark as unread</ToolbarButton>
      </Toolbar>,
    );
    const toolbar = screen.getByRole('toolbar', { name: 'Actions' });
    const stops = [toolbar, ...toolbar.querySelectorAll<HTMLElement>('*')].filter((el) => el.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(screen.getAllByRole('button').every((b) => b.tabIndex === -1)).toBe(true);
  });
});

describe('SplitView', () => {
  const view = (props: Partial<Parameters<typeof SplitView>[0]> = {}) => render(<SplitView list={<p>list</p>} detail={<p>detail</p>} listLabel="Conversations" detailLabel="Conversation" {...props} />);

  it('names both regions and resizes the list from the keyboard, within its limits', () => {
    const onListSizeChange = vi.fn();
    view({ onListSizeChange });
    expect(screen.getByRole('region', { name: 'Conversations' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Conversation' })).toBeTruthy();
    const divider = screen.getByRole('separator', { name: 'Resize list' });
    expect(divider.getAttribute('aria-valuenow')).toBe('40');
    fireEvent.keyDown(divider, { key: 'ArrowRight' });
    expect(divider.getAttribute('aria-valuenow')).toBe('45');
    fireEvent.keyDown(divider, { key: 'End' });
    expect(divider.getAttribute('aria-valuenow')).toBe('65');
    fireEvent.keyDown(divider, { key: 'ArrowRight' });
    expect(divider.getAttribute('aria-valuenow')).toBe('65');
    fireEvent.keyDown(divider, { key: 'Home' });
    expect(onListSizeChange).toHaveBeenLastCalledWith(25);
  });

  it('steps through preset widths on a click: the single-pointer alternative to dragging', () => {
    view();
    const divider = screen.getByRole('separator');
    divider.setPointerCapture = () => undefined;
    fireEvent.pointerDown(divider, { pointerId: 1 });
    fireEvent.pointerUp(divider, { pointerId: 1 });
    expect(divider.getAttribute('aria-valuenow')).toBe('55');
    fireEvent.pointerDown(divider, { pointerId: 1 });
    fireEvent.pointerUp(divider, { pointerId: 1 });
    expect(divider.getAttribute('aria-valuenow')).toBe('30');
  });
});
