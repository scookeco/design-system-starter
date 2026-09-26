// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette, PageHeader, type CommandGroup } from '../../src/index';
import { matchScore } from '../../src/components/CommandPalette/CommandPalette';
import { ExampleShell } from '../../src/examples/ExampleShell';
import { renderWithApp, setupMockApi } from './app-harness';

afterEach(cleanup);
setupMockApi();

// jsdom lacks scrollIntoView.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

describe('matching', () => {
  it('ranks prefix over word start over contains over letters in order', () => {
    expect(matchScore('nor', 'Northwind Traders')).toBe(4);
    expect(matchScore('tra', 'Northwind Traders')).toBe(3);
    expect(matchScore('wind', 'Northwind Traders')).toBe(2);
    expect(matchScore('nwt', 'Northwind Traders')).toBe(1);
    expect(matchScore('xyz', 'Northwind Traders')).toBe(0);
    expect(matchScore('new', 'Adventure Works')).toBe(0);
    expect(matchScore('garcia', 'Mateo García')).toBe(3);
  });
});

describe('CommandPalette', () => {
  const home = vi.fn();
  const create = vi.fn();
  const groups: CommandGroup[] = [
    { id: 'pages', label: 'Jump to', items: [{ id: 'home', label: 'Home', onSelect: home }, { id: 'records', label: 'Records', onSelect: vi.fn() }] },
    { id: 'actions', label: 'Actions', items: [{ id: 'new', label: 'New record', keywords: ['create'], onSelect: create }] },
  ];

  it('is a combobox over a grouped listbox, announcing the count', () => {
    render(<CommandPalette defaultOpen groups={groups} />);
    const input = screen.getByRole('combobox', { name: 'Command palette' });
    expect(document.activeElement).toBe(input);
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('group', { name: 'Jump to' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('3 results');
    fireEvent.change(input, { target: { value: 'create' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['New record']);
    expect(screen.getByRole('status').textContent).toBe('1 result');
  });

  it('moves with the arrows (wrapping) and runs the active option with Enter, then closes', () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette defaultOpen groups={groups} onOpenChange={onOpenChange} />);
    const input = screen.getByRole('combobox');
    const active = () => document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent;
    expect(active()).toBe('Home');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(active()).toBe('New record');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(active()).toBe('Records');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(home).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('says when nothing matches', () => {
    render(<CommandPalette defaultOpen groups={groups} query="zzz" />);
    expect(screen.getByText('Nothing matches. Try another word.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('0 results');
  });
});

describe('the app’s palette: permission filtering', () => {
  const options = () => screen.getAllByRole('option').map((o) => o.textContent ?? '');

  it('offers an admin the create pages and actions', async () => {
    renderWithApp(
      <ExampleShell current="/home" initialPaletteQuery="new">
        <PageHeader title="Home" />
      </ExampleShell>,
    );
    await waitFor(() => expect(options().some((o) => o.startsWith('New record'))).toBe(true));
    expect(options().some((o) => o.startsWith('New account'))).toBe(true);
    expect(options().some((o) => o.startsWith('Records › New'))).toBe(true);
  });

  it('offers a viewer neither: the same `can` as the buttons and the route guards', async () => {
    renderWithApp(
      <ExampleShell current="/home" initialPaletteQuery="new">
        <PageHeader title="Home" />
      </ExampleShell>,
      { role: 'viewer' },
    );
    await waitFor(() => expect(screen.getByRole('status').textContent).not.toBe('Searching…'));
    expect(options().filter((o) => /New record|New account|Records › New|Accounts › New/.test(o))).toEqual([]);
  });

  it('finds records through the server’s search, which hides drafts from a viewer', async () => {
    renderWithApp(
      <ExampleShell current="/home" initialPaletteQuery="lease">
        <PageHeader title="Home" />
      </ExampleShell>,
      { role: 'viewer' },
    );
    const records = await screen.findByRole('group', { name: 'Records' });
    const rows = within(records).getAllByRole('option').map((o) => o.textContent ?? '');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => /lease/i.test(row) && !row.includes('Draft'))).toBe(true);
  });
});

describe('the app’s "g then …" jumps', () => {
  it('each names a page the palette lists, so its shortcut is registered and shown', async () => {
    const { GO_KEYS, JUMP_ROUTES } = await import('../../src/examples/CommandMenu');
    const listed = new Set(JUMP_ROUTES.map((r) => r.path));
    expect(Object.keys(GO_KEYS).filter((path) => !listed.has(path))).toEqual([]);
  });
});
