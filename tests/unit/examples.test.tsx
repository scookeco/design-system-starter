// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CreateEditFlow } from '../../src/examples/CreateEditFlow';
import { SettingsPage } from '../../src/examples/SettingsPage';

afterEach(cleanup);

// jsdom has no ResizeObserver; Radix measures its hidden form inputs with one inside a <form>.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Create and edit example', () => {
  it('on a failed submit focuses an error summary whose links move focus to each invalid field', () => {
    render(<CreateEditFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Create record' }));

    const summary = screen.getByText('There are 4 problems with this record').closest('[tabindex="-1"]');
    expect(document.activeElement).toBe(summary);
    // Focus announces it, so it is a named region rather than an alert that would say it twice.
    expect(summary).toBe(screen.getByRole('region', { name: 'There are 4 problems with this record' }));
    expect(screen.queryByRole('alert')).toBeNull();

    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name.getAttribute('aria-invalid')).toBe('true');
    fireEvent.click(screen.getByRole('link', { name: 'Enter a name for the record.' }));
    expect(document.activeElement).toBe(name);

    fireEvent.click(screen.getByRole('link', { name: 'Choose what happens when the term ends.' }));
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Renews automatically' }));
  });

  it('clears a field error as soon as it is fixed, keeping what was typed', () => {
    render(<CreateEditFlow initialSubmitted />);
    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Hardware lease' } });
    expect(name.getAttribute('aria-invalid')).toBeNull();
    expect((name as HTMLInputElement).value).toBe('Hardware lease');
    expect(screen.getByText('There are 3 problems with this record')).toBeTruthy();
  });
});

describe('Settings example', () => {
  it('keeps the tiers apart in a labelled sub-nav and switches category through it', () => {
    render(<SettingsPage />);
    const subNav = screen.getByRole('navigation', { name: 'Settings' });
    expect(within(subNav).getByRole('list', { name: 'Personal' })).toBeTruthy();
    expect(within(subNav).getByRole('list', { name: 'Workspace' })).toBeTruthy();
    expect(within(subNav).getByRole('link', { name: 'Notifications' }).getAttribute('aria-current')).toBe('page');

    fireEvent.click(within(subNav).getByRole('link', { name: 'General' }));
    expect(screen.getByRole('heading', { level: 2, name: 'General' })).toBeTruthy();
    expect(within(subNav).getByRole('link', { name: 'General' }).getAttribute('aria-current')).toBe('page');
  });

  it('announces a successful save in a status banner', () => {
    render(<SettingsPage initialSaved />);
    expect(screen.getByRole('status').textContent).toContain('Notification preferences saved.');
  });
});
